from sqlalchemy import (
    Column, Integer, String, Boolean, Float, DateTime, Text, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class PlayerStatus(str, enum.Enum):
    waiting = "waiting"
    approved = "approved"
    playing = "playing"
    finished = "finished"
    eliminated = "eliminated"


class QuestionType(str, enum.Enum):
    image = "image"
    theory = "theory"
    code = "code"


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String(10), unique=True, index=True, nullable=False)
    quiz_started = Column(Boolean, default=False)
    quiz_ended = Column(Boolean, default=False)
    quiz_paused = Column(Boolean, default=False)
    current_question_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    players = relationship("Player", back_populates="room", cascade="all, delete-orphan")


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    room_code = Column(String(10), ForeignKey("rooms.room_code"), nullable=False)
    status = Column(Enum(PlayerStatus), default=PlayerStatus.waiting)
    score = Column(Integer, default=0)
    time_taken = Column(Float, default=0.0)
    questions_answered = Column(Integer, default=0)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)

    @property
    def college_name(self):
        return self.department

    room = relationship("Room", back_populates="players")
    answers = relationship("Answer", back_populates="player", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(QuestionType), nullable=False)
    question = Column(Text, nullable=False)
    image1 = Column(String(500), nullable=True)
    image2 = Column(String(500), nullable=True)
    image3 = Column(String(500), nullable=True)
    option1 = Column(String(500), nullable=False)
    option2 = Column(String(500), nullable=False)
    option3 = Column(String(500), nullable=False)
    option4 = Column(String(500), nullable=False)
    option5 = Column(String(500), nullable=True)
    correct_answer = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    answers = relationship("Answer", back_populates="question")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected_option = Column(String(500), nullable=True)
    is_correct = Column(Boolean, default=False)
    time_taken = Column(Float, default=0.0)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())

    player = relationship("Player", back_populates="answers")
    question = relationship("Question", back_populates="answers")
