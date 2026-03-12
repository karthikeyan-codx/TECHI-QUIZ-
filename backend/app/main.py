"""
FastAPI application entry point.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import init_db
from app.routes import router
from app.websocket import handle_admin_ws, handle_player_ws

app = FastAPI(
    title="Technical Quiz API",
    description="Real-time multiplayer technical quiz platform",
    version="1.0.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST Routes ────────────────────────────────────────────────────────────────
app.include_router(router, prefix="/api")


# ── WebSocket Endpoints ────────────────────────────────────────────────────────

@app.websocket("/ws/admin/{room_code}")
async def admin_websocket(websocket: WebSocket, room_code: str):
    try:
        await handle_admin_ws(websocket, room_code)
    except WebSocketDisconnect:
        pass


@app.websocket("/ws/player/{room_code}/{player_id}")
async def player_websocket(websocket: WebSocket, room_code: str, player_id: int):
    try:
        await handle_player_ws(websocket, room_code, player_id)
    except WebSocketDisconnect:
        pass


# ── Startup / Shutdown ─────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    await init_db()


@app.get("/")
async def root():
    return {"message": "Technical Quiz API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
