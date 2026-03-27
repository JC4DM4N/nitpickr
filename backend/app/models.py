from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    username = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class App(Base):
    __tablename__ = "apps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    initials = Column(String(4), nullable=False)
    color = Column(String(7), nullable=False)
    url = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    stage = Column(String(20), nullable=False)
    description = Column(Text, nullable=False)
    request     = Column(Text, nullable=False)
    views = Column(Integer, nullable=False, default=0)
    feedbacks = Column(Integer, nullable=False, default=0)
    credits = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Review(Base):
    __tablename__ = "reviews"

    id           = Column(Integer, primary_key=True, index=True)
    app_id       = Column(Integer, ForeignKey("apps.id",  ondelete="CASCADE"), nullable=False)
    reviewer_id  = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_complete  = Column(Boolean, nullable=False, default=False)
    feedback     = Column(Text, nullable=True)
    created_date = Column(DateTime(timezone=True), server_default=func.now())


class ReviewScreenshot(Base):
    __tablename__ = "review_screenshots"

    id        = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False)
    filename  = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
