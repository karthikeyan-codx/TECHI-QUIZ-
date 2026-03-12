"""
All REST API routes — Auth, Room, Player, Questions, QR, Excel upload, Leaderboard.
"""
import io
import base64
import random
import string
from typing import List, Optional

import qrcode
import qrcode.image.svg
from PIL import Image
import pandas as pd

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database import get_db
from app.models import Room, Player, Question, PlayerStatus, QuestionType
from app.schemas import (
    AdminLogin, AdminLoginResponse,
    PlayerJoin, PlayerOut,
    RoomOut, QuestionOut, QuestionWithAnswer,
    SubmitAnswer, AnswerOut,
    LeaderboardEntry, RoomStats,
)
from app.config import settings
from app.quiz_engine import get_leaderboard, get_or_create_room_state

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────────

def generate_room_code(length: int = 5) -> str:
    return "".join(random.choices(string.digits, k=length))


def make_qr_base64(url: str) -> str:
    """Generate QR code PNG → base64 data URI."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#00d4ff", back_color="#0a0a0a")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{b64}"


# ── Auth ───────────────────────────────────────────────────────────────────────

@router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLogin, db: AsyncSession = Depends(get_db)):
    if payload.password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")

    # Generate unique room code
    for _ in range(10):
        code = generate_room_code()
        result = await db.execute(select(Room).where(Room.room_code == code))
        if not result.scalar_one_or_none():
            break
    else:
        raise HTTPException(status_code=500, detail="Could not generate unique room code")

    room = Room(room_code=code)
    db.add(room)
    await db.commit()
    await db.refresh(room)

    return AdminLoginResponse(success=True, room_code=code, message="Room created")


@router.post("/host/login")
async def host_login_legacy(
    password: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    return await admin_login(AdminLogin(password=password), db)


# ── QR Code ────────────────────────────────────────────────────────────────────

@router.get("/room/{room_code}/qr")
async def get_qr_code(room_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).where(Room.room_code == room_code))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    join_url = f"{settings.FRONTEND_URL}/join?room={room_code}"
    qr_b64 = make_qr_base64(join_url)
    return {"room_code": room_code, "join_url": join_url, "qr_code": qr_b64}


# ── Room ───────────────────────────────────────────────────────────────────────

@router.get("/room/{room_code}", response_model=RoomOut)
async def get_room(room_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).where(Room.room_code == room_code))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.get("/room/{room_code}/stats", response_model=RoomStats)
async def get_stats(room_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Player).where(Player.room_code == room_code))
    players = result.scalars().all()

    state = get_or_create_room_state(room_code)

    from app.models import Question as Q
    q_result = await db.execute(select(Q))
    total_q = len(q_result.scalars().all())

    return RoomStats(
        total_joined=len(players),
        total_approved=sum(1 for p in players if p.status == PlayerStatus.approved),
        total_playing=sum(1 for p in players if p.status == PlayerStatus.playing),
        total_finished=sum(1 for p in players if p.status == PlayerStatus.finished),
        total_eliminated=sum(1 for p in players if p.status == PlayerStatus.eliminated),
        current_question=state.current_index,
        total_questions=min(total_q, 60),
    )


# ── Player ─────────────────────────────────────────────────────────────────────

@router.post("/player/join", response_model=PlayerOut)
async def join_game(payload: PlayerJoin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).where(Room.room_code == payload.room_code))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found. Check the room code.")
    if room.quiz_ended:
        raise HTTPException(status_code=400, detail="This quiz has already ended.")
    if room.quiz_started:
        raise HTTPException(status_code=400, detail="Quiz already in progress. Cannot join now.")

    # Prevent duplicate join (same name + college + room)
    dup = await db.execute(
        select(Player).where(
            Player.room_code == payload.room_code,
            Player.name == payload.name,
            Player.department == payload.department,
        )
    )
    existing = dup.scalar_one_or_none()
    if existing:
        return existing

    player = Player(
        name=payload.name,
        department=payload.department,
        room_code=payload.room_code,
        status=PlayerStatus.waiting,
    )
    db.add(player)
    await db.commit()
    await db.refresh(player)
    return player


@router.post("/join", response_model=PlayerOut)
async def join_game_legacy(
    name: str = Form(...),
    dept: str = Form(...),
    room_code: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    payload = PlayerJoin(name=name, department=dept, college_name=dept, room_code=room_code)
    return await join_game(payload, db)


@router.get("/room/{room_code}/players", response_model=List[PlayerOut])
async def list_players(room_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Player).where(Player.room_code == room_code))
    return result.scalars().all()


@router.get("/admin/players/{room_code}", response_model=List[PlayerOut])
async def list_players_legacy(room_code: str, db: AsyncSession = Depends(get_db)):
    return await list_players(room_code, db)


@router.get("/player/{player_id}", response_model=PlayerOut)
async def get_player(player_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.post("/admin/approve/{player_id}")
async def approve_player_rest(player_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    player.status = PlayerStatus.approved
    await db.commit()
    return {"success": True, "player_id": player_id, "status": "approved"}


@router.post("/admin/approve-all/{room_code}")
async def approve_all_players(room_code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Player).where(
            Player.room_code == room_code,
            Player.status == PlayerStatus.waiting,
        )
    )
    players = result.scalars().all()
    for p in players:
        p.status = PlayerStatus.approved
    await db.commit()
    return {"success": True, "approved_count": len(players)}


# ── Questions ──────────────────────────────────────────────────────────────────

@router.get("/questions", response_model=List[QuestionWithAnswer])
async def list_questions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question))
    return result.scalars().all()


@router.get("/questions/count")
async def question_count(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question))
    questions = result.scalars().all()
    by_type = {}
    for q in questions:
        by_type[q.type] = by_type.get(q.type, 0) + 1
    return {"total": len(questions), "by_type": by_type}


@router.delete("/admin/questions/clear")
async def clear_questions(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete
    await db.execute(delete(Question))
    await db.commit()
    return {"success": True, "message": "All questions deleted"}


# ── Excel Upload ───────────────────────────────────────────────────────────────

@router.post("/admin/upload-questions")
async def upload_questions(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx/.xls) are accepted")

    content = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse Excel: {e}")

    required_cols = {"type", "question", "option1", "option2", "option3", "option4", "correct_answer"}
    missing = required_cols - set(df.columns.str.lower())
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {missing}")

    df.columns = df.columns.str.lower()
    inserted = 0
    errors = []

    for idx, row in df.iterrows():
        try:
            q_type_raw = str(row.get("type", "")).strip().lower()
            if q_type_raw not in ("image", "theory", "code"):
                errors.append(f"Row {idx + 2}: invalid type '{q_type_raw}'")
                continue

            q = Question(
                type=QuestionType(q_type_raw),
                question=str(row["question"]).strip(),
                image1=str(row.get("image1", "") or "").strip() or None,
                image2=str(row.get("image2", "") or "").strip() or None,
                image3=str(row.get("image3", "") or "").strip() or None,
                option1=str(row["option1"]).strip(),
                option2=str(row["option2"]).strip(),
                option3=str(row["option3"]).strip(),
                option4=str(row["option4"]).strip(),
                option5=str(row.get("option5", "") or "").strip() or None,
                correct_answer=str(row["correct_answer"]).strip(),
            )
            db.add(q)
            inserted += 1
        except Exception as e:
            errors.append(f"Row {idx + 2}: {e}")

    await db.commit()
    return {"success": True, "inserted": inserted, "errors": errors}


@router.post("/admin/seed-questions")
async def seed_questions_from_json(db: AsyncSession = Depends(get_db)):
    """Seed all 60 built-in questions from questions.json."""
    import json, os
    json_path = os.path.join(os.path.dirname(__file__), "..", "questions", "questions.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="questions.json not found")

    with open(json_path, "r", encoding="utf-8") as f:
        questions_data = json.load(f)

    inserted = 0
    for item in questions_data:
        q = Question(
            type=QuestionType(item["type"]),
            question=item["question"],
            image1=item.get("image1"),
            image2=item.get("image2"),
            image3=item.get("image3"),
            option1=item["option1"],
            option2=item["option2"],
            option3=item["option3"],
            option4=item["option4"],
            option5=item.get("option5"),
            correct_answer=item["correct_answer"],
        )
        db.add(q)
        inserted += 1

    await db.commit()
    return {"success": True, "inserted": inserted}


# ── Leaderboard ────────────────────────────────────────────────────────────────

@router.get("/room/{room_code}/leaderboard")
async def leaderboard(room_code: str):
    lb = await get_leaderboard(room_code)
    return {"leaderboard": lb}


@router.get("/admin/leaderboard/{room_code}")
async def leaderboard_legacy(room_code: str):
    return await leaderboard(room_code)
