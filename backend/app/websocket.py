"""
WebSocket manager — handles all real-time communication between Admin and Players.
"""
import json
import asyncio
from typing import Dict, Set, Optional
from fastapi import WebSocket
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Player, PlayerStatus, Question, Room as RoomModel
from app.quiz_engine import (
    active_rooms,
    get_or_create_room_state,
    build_player_question_order,
    load_and_randomize_questions,
    shuffle_options,
    record_answer,
    mark_player_eliminated,
    mark_player_finished,
    get_leaderboard,
)

QUESTION_TIME_LIMIT = 15  # seconds


# ── Connection Registry ────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        # room_code → set of WebSocket (admin)
        self.admin_connections: Dict[str, WebSocket] = {}
        # room_code → { player_id: WebSocket }
        self.player_connections: Dict[str, Dict[int, WebSocket]] = {}

    async def connect_admin(self, room_code: str, ws: WebSocket):
        await ws.accept()
        self.admin_connections[room_code] = ws

    async def connect_player(self, room_code: str, player_id: int, ws: WebSocket):
        await ws.accept()
        if room_code not in self.player_connections:
            self.player_connections[room_code] = {}
        self.player_connections[room_code][player_id] = ws

    def disconnect_admin(self, room_code: str):
        self.admin_connections.pop(room_code, None)

    def disconnect_player(self, room_code: str, player_id: int):
        if room_code in self.player_connections:
            self.player_connections[room_code].pop(player_id, None)

    async def send_to_admin(self, room_code: str, data: dict):
        ws = self.admin_connections.get(room_code)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                self.disconnect_admin(room_code)

    async def send_to_player(self, room_code: str, player_id: int, data: dict):
        ws = self.player_connections.get(room_code, {}).get(player_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                self.disconnect_player(room_code, player_id)

    async def broadcast_to_players(self, room_code: str, data: dict, exclude: Optional[Set[int]] = None):
        exclude = exclude or set()
        connections = self.player_connections.get(room_code, {})
        dead = []
        for pid, ws in connections.items():
            if pid in exclude:
                continue
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(pid)
        for pid in dead:
            connections.pop(pid, None)

    def connected_player_ids(self, room_code: str) -> Set[int]:
        return set(self.player_connections.get(room_code, {}).keys())


manager = ConnectionManager()


# ── Timer Loop ─────────────────────────────────────────────────────────────────

async def question_timer_loop(room_code: str):
    """Runs one timer tick per second, broadcasts countdown, advances questions."""
    state = get_or_create_room_state(room_code)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Player).where(
            Player.room_code == room_code,
            Player.status == PlayerStatus.approved
        ))
        approved_players = result.scalars().all()

    total_questions = len(state.question_ids)

    while state.current_index < total_questions and not state.ended:
        # Wait if paused
        while state.paused and not state.ended:
            await asyncio.sleep(0.5)

        if state.ended:
            break

        # Broadcast question to each player (individualised order + shuffled options)
        await send_question_to_all(room_code, state.current_index)

        # Countdown
        for remaining in range(QUESTION_TIME_LIMIT, -1, -1):
            if state.paused:
                while state.paused and not state.ended:
                    await asyncio.sleep(0.5)
            if state.ended:
                break

            await manager.broadcast_to_players(room_code, {
                "type": "timer",
                "remaining": remaining,
                "question_index": state.current_index,
            })
            await manager.send_to_admin(room_code, {
                "type": "timer",
                "remaining": remaining,
                "question_index": state.current_index,
                "total_questions": total_questions,
            })
            if remaining == 0:
                break
            await asyncio.sleep(1)

        state.current_index += 1

        # Update DB
        async with AsyncSessionLocal() as db:
            from sqlalchemy import update
            await db.execute(
                update(RoomModel)
                .where(RoomModel.room_code == room_code)
                .values(current_question_index=state.current_index)
            )
            await db.commit()

        # Send "next question" signal
        if state.current_index < total_questions:
            await asyncio.sleep(0.5)

    # Quiz over
    if not state.ended:
        state.ended = True
        await end_quiz(room_code)


async def send_question_to_all(room_code: str, index: int):
    """Send each active player their personalised randomised question."""
    state = get_or_create_room_state(room_code)
    player_ids = manager.connected_player_ids(room_code)

    async with AsyncSessionLocal() as db:
        for pid in player_ids:
            q_id = state.get_player_question_at(pid, index)
            if q_id is None:
                continue
            result = await db.execute(select(Question).where(Question.id == q_id))
            question = result.scalar_one_or_none()
            if not question:
                continue

            q_data = shuffle_options(question)
            q_data["type"] = "question"
            q_data["question_index"] = index
            q_data["total_questions"] = len(state.question_ids)
            q_data["round"] = get_round_label(index)
            await manager.send_to_player(room_code, pid, q_data)

    # Also tell admin which question number is active
    await manager.send_to_admin(room_code, {
        "type": "question_advance",
        "question_index": index,
        "total_questions": len(state.question_ids),
    })


def get_round_label(index: int) -> str:
    if index < 20:
        return "Round 1 — Image Identification"
    elif index < 40:
        return "Round 2 — Theory & Commands"
    return "Round 3 — Code Output / Error Detection"


async def end_quiz(room_code: str):
    """Mark all still-playing players as finished and broadcast results."""
    async with AsyncSessionLocal() as db:
        from sqlalchemy import update
        # Mark room ended
        await db.execute(
            update(RoomModel)
            .where(RoomModel.room_code == room_code)
            .values(quiz_ended=True, quiz_started=False)
        )
        # Mark remaining playing players as finished
        result = await db.execute(
            select(Player).where(
                Player.room_code == room_code,
                Player.status == PlayerStatus.playing,
            )
        )
        for player in result.scalars().all():
            player.status = PlayerStatus.finished
        await db.commit()

    # Broadcast quiz_end to all players
    await manager.broadcast_to_players(room_code, {"type": "quiz_end"})

    # Send leaderboard to admin
    lb = await get_leaderboard(room_code)
    await manager.send_to_admin(room_code, {
        "type": "quiz_ended",
        "leaderboard": lb,
    })


# ── Admin WebSocket Handler ────────────────────────────────────────────────────

async def handle_admin_ws(ws: WebSocket, room_code: str):
    await manager.connect_admin(room_code, ws)
    state = get_or_create_room_state(room_code)

    try:
        # Send current connected player count immediately
        await manager.send_to_admin(room_code, {
            "type": "connected",
            "room_code": room_code,
            "players": await get_player_list(room_code),
        })

        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            action = msg.get("action")

            if action == "start_quiz":
                await handle_start_quiz(room_code)

            elif action == "pause_quiz":
                state.paused = True
                async with AsyncSessionLocal() as db:
                    from sqlalchemy import update
                    await db.execute(
                        update(RoomModel)
                        .where(RoomModel.room_code == room_code)
                        .values(quiz_paused=True)
                    )
                    await db.commit()
                await manager.broadcast_to_players(room_code, {"type": "quiz_paused"})
                await manager.send_to_admin(room_code, {"type": "quiz_paused"})

            elif action == "resume_quiz":
                state.paused = False
                async with AsyncSessionLocal() as db:
                    from sqlalchemy import update
                    await db.execute(
                        update(RoomModel)
                        .where(RoomModel.room_code == room_code)
                        .values(quiz_paused=False)
                    )
                    await db.commit()
                await manager.broadcast_to_players(room_code, {"type": "quiz_resumed"})
                await manager.send_to_admin(room_code, {"type": "quiz_resumed"})

            elif action == "end_quiz":
                state.ended = True
                if state.timer_task:
                    state.timer_task.cancel()
                await end_quiz(room_code)

            elif action == "approve_player":
                player_id = msg.get("player_id")
                await approve_player(room_code, player_id)

            elif action == "get_leaderboard":
                lb = await get_leaderboard(room_code)
                await manager.send_to_admin(room_code, {
                    "type": "leaderboard",
                    "leaderboard": lb,
                })

            elif action == "get_stats":
                stats = await get_room_stats(room_code)
                await manager.send_to_admin(room_code, {
                    "type": "stats",
                    **stats,
                })

    except Exception:
        pass
    finally:
        manager.disconnect_admin(room_code)


async def handle_start_quiz(room_code: str):
    state = get_or_create_room_state(room_code)
    if state.started:
        return

    # Load questions
    master_ids = await load_and_randomize_questions(room_code)
    state.question_ids = master_ids

    # Build per-player randomised question list
    async with AsyncSessionLocal() as db:
        from sqlalchemy import update

        result = await db.execute(
            select(Player).where(
                Player.room_code == room_code,
                Player.status == PlayerStatus.approved,
            )
        )
        approved = result.scalars().all()

        for player in approved:
            state.player_question_map[player.id] = build_player_question_order(master_ids)
            player.status = PlayerStatus.playing

        await db.execute(
            update(RoomModel)
            .where(RoomModel.room_code == room_code)
            .values(quiz_started=True, quiz_paused=False, quiz_ended=False)
        )
        await db.commit()

    state.started = True
    state.current_index = 0

    await manager.broadcast_to_players(room_code, {"type": "quiz_start"})
    await manager.send_to_admin(room_code, {
        "type": "quiz_started",
        "total_questions": len(master_ids),
        "approved_count": len(approved),
    })

    # Kick off timer loop in background
    state.timer_task = asyncio.create_task(question_timer_loop(room_code))


# ── Player WebSocket Handler ───────────────────────────────────────────────────

async def handle_player_ws(ws: WebSocket, room_code: str, player_id: int):
    await manager.connect_player(room_code, player_id, ws)

    try:
        # Notify admin of new join
        await notify_admin_player_joined(room_code)

        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            action = msg.get("action")

            if action == "submit_answer":
                await handle_submit_answer(room_code, player_id, msg)

            elif action == "cheat_detected":
                await handle_cheat(room_code, player_id)

            elif action == "quiz_finished":
                total_time = msg.get("total_time", 0.0)
                await mark_player_finished(player_id, total_time)
                score = await get_player_score(player_id)
                await manager.send_to_player(room_code, player_id, {
                    "type": "result",
                    "score": score,
                    "total_questions": 60,
                    "total_time": total_time,
                })
                await notify_admin_player_finished(room_code)

    except Exception:
        pass
    finally:
        manager.disconnect_player(room_code, player_id)
        await notify_admin_player_joined(room_code)


async def handle_submit_answer(room_code: str, player_id: int, msg: dict):
    question_id = msg.get("question_id")
    selected_option = msg.get("selected_option")
    time_taken = float(msg.get("time_taken") or 0.0)

    if question_id is None:
        return

    is_correct = await record_answer(player_id, int(question_id), selected_option, time_taken)

    # Update admin stats
    stats = await get_room_stats(room_code)
    await manager.send_to_admin(room_code, {"type": "stats", **stats})


async def handle_cheat(room_code: str, player_id: int):
    await mark_player_eliminated(player_id)
    await manager.send_to_player(room_code, player_id, {
        "type": "eliminated",
        "reason": "Tab switch or window blur detected.",
    })
    manager.disconnect_player(room_code, player_id)
    await notify_admin_player_joined(room_code)

    stats = await get_room_stats(room_code)
    await manager.send_to_admin(room_code, {"type": "stats", **stats})


# ── Helpers ────────────────────────────────────────────────────────────────────

async def approve_player(room_code: str, player_id: int):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Player).where(Player.id == player_id))
        player = result.scalar_one_or_none()
        if player and player.status == PlayerStatus.waiting:
            player.status = PlayerStatus.approved
            await db.commit()

    await manager.send_to_player(room_code, player_id, {"type": "approved"})
    await manager.send_to_admin(room_code, {
        "type": "player_approved",
        "player_id": player_id,
        "players": await get_player_list(room_code),
    })


async def get_player_list(room_code: str) -> list:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Player).where(Player.room_code == room_code)
        )
        players = result.scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "department": p.department,
            "college_name": p.department,
            "status": p.status,
            "score": p.score,
        }
        for p in players
    ]


async def get_player_score(player_id: int) -> int:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Player).where(Player.id == player_id))
        player = result.scalar_one_or_none()
        return player.score if player else 0


async def get_room_stats(room_code: str) -> dict:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Player).where(Player.room_code == room_code)
        )
        players = result.scalars().all()

    state = active_rooms.get(room_code)
    return {
        "total_joined": len(players),
        "total_approved": sum(1 for p in players if p.status == PlayerStatus.approved),
        "total_playing": sum(1 for p in players if p.status == PlayerStatus.playing),
        "total_finished": sum(1 for p in players if p.status == PlayerStatus.finished),
        "total_eliminated": sum(1 for p in players if p.status == PlayerStatus.eliminated),
        "current_question": state.current_index if state else 0,
        "total_questions": len(state.question_ids) if state else 60,
    }


async def notify_admin_player_joined(room_code: str):
    players = await get_player_list(room_code)
    await manager.send_to_admin(room_code, {
        "type": "player_list_update",
        "players": players,
    })


async def notify_admin_player_finished(room_code: str):
    stats = await get_room_stats(room_code)
    await manager.send_to_admin(room_code, {"type": "stats", **stats})
