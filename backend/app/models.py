from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    username = Column(String(50), unique=True, nullable=False, index=True)
    credits        = Column(Integer, nullable=False, default=0)
    escrow_credits = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class App(Base):
    __tablename__ = "apps"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    initials = Column(String(4), nullable=False)
    color = Column(String(7), nullable=False)
    url = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    stage = Column(String(20), nullable=False)
    description = Column(Text, nullable=False)
    request     = Column(Text, nullable=False)
    credits         = Column(Integer, nullable=False, default=1)
    is_hidden       = Column(Boolean, nullable=False, default=False)
    is_multi_review = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Review(Base):
    __tablename__ = "reviews"

    id           = Column(Integer, primary_key=True, index=True)
    app_id       = Column(Integer, ForeignKey("apps.id",  ondelete="CASCADE"), nullable=False)
    reviewer_id  = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_submitted       = Column(Boolean, nullable=False, default=False)
    is_complete        = Column(Boolean, nullable=False, default=False)
    is_rejected        = Column(Boolean, nullable=False, default=False)
    review_requested   = Column(Boolean, nullable=False, default=False)
    feedback      = Column(Text, nullable=True)
    owner_message = Column(Text, nullable=True)
    created_date       = Column(DateTime(timezone=True), server_default=func.now())
    reviewer_deadline  = Column(DateTime(timezone=True), nullable=True)
    owner_deadline     = Column(DateTime(timezone=True), nullable=True)
    tested_platform  = Column(String(10), nullable=True)
    test_duration    = Column(Text, nullable=True)
    created_account  = Column(Boolean, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id        = Column(Integer, primary_key=True, index=True)
    user_id   = Column(Integer, ForeignKey("users.id",    ondelete="CASCADE"), nullable=False)
    type      = Column(String(50), nullable=False)
    message   = Column(Text, nullable=False)
    app_id    = Column(Integer, ForeignKey("apps.id",     ondelete="CASCADE"), nullable=True)
    review_id = Column(Integer, ForeignKey("reviews.id",  ondelete="CASCADE"), nullable=True)
    is_read   = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id         = Column(Integer, primary_key=True, index=True)
    token      = Column(String(100), unique=True, nullable=False, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)


class ReviewScreenshot(Base):
    __tablename__ = "review_screenshots"

    id        = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False)
    filename  = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
