"""
Quiz Engine — handles randomisation, question serving, scoring,
and in-memory room state that coordinates with WebSocket broadcasts.
"""
import random
import asyncio
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Question, Player, Answer, Room, PlayerStatus, QuestionType
from app.database import AsyncSessionLocal


# ── In-memory room registry ────────────────────────────────────────────────────
# room_code → RoomState
active_rooms: Dict[str, "RoomState"] = {}


class RoomState:
    """All transient per-room data kept in RAM."""

    def __init__(self, room_code: str):
        self.room_code = room_code
        self.question_ids: List[int] = []          # ordered for this room
        self.player_question_map: Dict[int, List[int]] = {}  # player_id → q_ids
        self.current_index: int = 0
        self.timer_task: Optional[asyncio.Task] = None
        self.paused: bool = False
        self.started: bool = False
        self.ended: bool = False

    def get_player_question_at(self, player_id: int, index: int) -> Optional[int]:
        qs = self.player_question_map.get(player_id)
        if qs and 0 <= index < len(qs):
            return qs[index]
        return None


def get_or_create_room_state(room_code: str) -> RoomState:
    if room_code not in active_rooms:
        active_rooms[room_code] = RoomState(room_code)
    return active_rooms[room_code]


# ── Question loading & randomisation ──────────────────────────────────────────

async def load_and_randomize_questions(room_code: str) -> List[int]:
    """
    Fetch all questions grouped by type, shuffle within each group,
    and return ordered list: 20 image → 20 theory → 20 code (capped at 20 each).
    Returns the master ordered question ID list for the room.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Question))
        all_questions = result.scalars().all()

    image_qs = [q.id for q in all_questions if q.type == QuestionType.image]
    theory_qs = [q.id for q in all_questions if q.type == QuestionType.theory]
    code_qs = [q.id for q in all_questions if q.type == QuestionType.code]

    random.shuffle(image_qs)
    random.shuffle(theory_qs)
    random.shuffle(code_qs)

    ordered = image_qs[:20] + theory_qs[:20] + code_qs[:20]
    return ordered


def build_player_question_order(master_ids: List[int]) -> List[int]:
    """
    Per-player shuffle: shuffle within each round block (keep round boundaries).
    Options are shuffled separately when sending to player.
    """
    image_block = master_ids[:20][:]
    theory_block = master_ids[20:40][:]
    code_block = master_ids[40:60][:]

    random.shuffle(image_block)
    random.shuffle(theory_block)
    random.shuffle(code_block)

    return image_block + theory_block + code_block


def shuffle_options(question: Question) -> dict:
    """Return question dict with shuffled options (correct answer position randomised)."""
    options = [question.option1, question.option2, question.option3, question.option4]
    if question.option5:
        options.append(question.option5)

    random.shuffle(options)

    return {
        "id": question.id,
        "question_type": question.type,
        "question": question.question,
        "image1": question.image1,
        "image2": question.image2,
        "image3": question.image3,
        "options": options,
    }


# ── Scoring ────────────────────────────────────────────────────────────────────

async def record_answer(
    player_id: int,
    question_id: int,
    selected_option: Optional[str],
    time_taken: float,
) -> bool:
    """Persist answer, update player score. Returns True if correct."""
    async with AsyncSessionLocal() as db:
        q_result = await db.execute(select(Question).where(Question.id == question_id))
        question = q_result.scalar_one_or_none()
        if not question:
            return False

        is_correct = (
            selected_option is not None
            and selected_option.strip().lower() == question.correct_answer.strip().lower()
        )

        answer = Answer(
            player_id=player_id,
            question_id=question_id,
            selected_option=selected_option,
            is_correct=is_correct,
            time_taken=time_taken,
        )
        db.add(answer)

        if is_correct:
            p_result = await db.execute(select(Player).where(Player.id == player_id))
            player = p_result.scalar_one_or_none()
            if player:
                player.score += 1
                player.time_taken += time_taken

        await db.commit()
    return is_correct


async def mark_player_eliminated(player_id: int):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Player).where(Player.id == player_id))
        player = result.scalar_one_or_none()
        if player:
            player.status = PlayerStatus.eliminated
            await db.commit()


async def mark_player_finished(player_id: int, total_time: float):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Player).where(Player.id == player_id))
        player = result.scalar_one_or_none()
        if player and player.status not in (PlayerStatus.eliminated,):
            player.status = PlayerStatus.finished
            player.time_taken = total_time
            await db.commit()


async def get_leaderboard(room_code: str) -> list:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Player)
            .where(
                Player.room_code == room_code,
                Player.status.in_([PlayerStatus.finished, PlayerStatus.playing]),
            )
            .order_by(Player.score.desc(), Player.time_taken.asc())
        )
        players = result.scalars().all()

    leaderboard = []
    for rank, p in enumerate(players, start=1):
        leaderboard.append(
            {
                "rank": rank,
                "player_id": p.id,
                "name": p.name,
                "department": p.department,
                "college_name": p.department,
                "score": p.score,
                "time_taken": round(p.time_taken, 2),
                "status": p.status,
            }
        )
    return leaderboard
