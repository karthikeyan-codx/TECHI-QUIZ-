from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from app.models import PlayerStatus, QuestionType


# ── Auth ──────────────────────────────────────────────────────────────────────
class AdminLogin(BaseModel):
    password: str


class AdminLoginResponse(BaseModel):
    success: bool
    room_code: str
    message: str


# ── Player ────────────────────────────────────────────────────────────────────
class PlayerJoin(BaseModel):
    name: str
    department: Optional[str] = None
    college_name: Optional[str] = None
    room_code: str

    @field_validator("name", "room_code")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()

    @field_validator("department", "college_name")
    @classmethod
    def strip_optional_whitespace(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if isinstance(v, str) else v

    @model_validator(mode="after")
    def sync_college_fields(self):
        chosen_value = self.college_name or self.department
        if not chosen_value:
            raise ValueError("college_name is required")
        self.college_name = chosen_value
        self.department = chosen_value
        return self


class PlayerOut(BaseModel):
    id: int
    name: str
    department: str
    college_name: str
    room_code: str
    status: PlayerStatus
    score: int
    time_taken: float
    questions_answered: int

    class Config:
        from_attributes = True


# ── Room ──────────────────────────────────────────────────────────────────────
class RoomOut(BaseModel):
    id: int
    room_code: str
    quiz_started: bool
    quiz_ended: bool
    quiz_paused: bool
    current_question_index: int

    class Config:
        from_attributes = True


# ── Question ──────────────────────────────────────────────────────────────────
class QuestionOut(BaseModel):
    id: int
    type: QuestionType
    question: str
    image1: Optional[str] = None
    image2: Optional[str] = None
    image3: Optional[str] = None
    option1: str
    option2: str
    option3: str
    option4: str
    option5: Optional[str] = None

    class Config:
        from_attributes = True


class QuestionWithAnswer(QuestionOut):
    correct_answer: str


# ── Answer ────────────────────────────────────────────────────────────────────
class SubmitAnswer(BaseModel):
    player_id: int
    question_id: int
    selected_option: Optional[str] = None
    time_taken: float = 0.0


class AnswerOut(BaseModel):
    id: int
    player_id: int
    question_id: int
    selected_option: Optional[str]
    is_correct: bool
    time_taken: float

    class Config:
        from_attributes = True


# ── Leaderboard ────────────────────────────────────────────────────────────────
class LeaderboardEntry(BaseModel):
    rank: int
    player_id: int
    name: str
    department: str
    college_name: str
    score: int
    time_taken: float
    status: PlayerStatus

    class Config:
        from_attributes = True


# ── Stats ─────────────────────────────────────────────────────────────────────
class RoomStats(BaseModel):
    total_joined: int
    total_approved: int
    total_playing: int
    total_finished: int
    total_eliminated: int
    current_question: int
    total_questions: int
