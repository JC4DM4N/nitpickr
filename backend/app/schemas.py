import re
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str

    @field_validator("username")
    @classmethod
    def username_single_word(cls, v: str) -> str:
        if not re.match(r'^[A-Za-z0-9_]+$', v):
            raise ValueError("Username must be a single word (letters, numbers, underscores only)")
        return v


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AppOut(BaseModel):
    id: int
    owner_id: int
    name: str
    initials: str
    color: str
    url: str
    category: str
    stage: str
    description: str
    request: str
    credits: int
    is_hidden: bool
    is_multi_review: bool
    approved_count: int
    in_progress_count: int
    owner_username: str
    owner_reviews_given: int

    model_config = {"from_attributes": True}


class ReviewOut(BaseModel):
    id: int
    app_id: int
    reviewer_id: int
    is_submitted: bool
    is_complete: bool
    is_rejected: bool
    review_requested: bool
    created_date: datetime
    reviewer_deadline: datetime | None
    owner_deadline: datetime | None
    app_name: str
    app_initials: str
    app_color: str
    app_stage: str
    app_url: str


class ReviewDetail(BaseModel):
    id: int
    app_id: int
    is_submitted: bool
    is_complete: bool
    is_rejected: bool
    review_requested: bool
    owner_message: str | None
    created_date: datetime
    reviewer_deadline: datetime | None
    owner_deadline: datetime | None
    app_name: str
    app_initials: str
    app_color: str
    app_stage: str
    app_url: str
    app_description: str
    app_request: str
    feedback: str | None
    screenshots: list[dict]
    reviewer_username: str
    tested_platform: str | None
    test_duration: str | None
    created_account: bool | None


class ReviewPatch(BaseModel):
    feedback: str | None = None
    is_submitted: bool | None = None
    tested_platform: str | None = None
    test_duration: str | None = None
    created_account: bool | None = None


class OwnerActionPayload(BaseModel):
    message: str


class AppCreate(BaseModel):
    name: str
    url: str
    category: str
    stage: str
    description: str
    request: str
    color: str


class AppPatch(BaseModel):
    name: str | None = None
    url: str | None = None
    category: str | None = None
    stage: str | None = None
    description: str | None = None
    request: str | None = None
    color: str | None = None
    is_hidden: bool | None = None


class UserCredits(BaseModel):
    available: int
    in_escrow: int
    total: int
    earned_ever: int
    spent_ever: int


class NotificationOut(BaseModel):
    id: int
    type: str
    message: str
    app_id: int | None
    review_id: int | None
    is_read: bool
    created_at: datetime


class UserProfile(BaseModel):
    id: int
    username: str
    available_credits: int


class AppReviewFeedItem(BaseModel):
    id: int
    reviewer_username: str
    feedback: str | None
    is_submitted: bool
    is_complete: bool
    is_rejected: bool
    review_requested: bool
    created_date: datetime
    reviewer_deadline: datetime | None
    owner_deadline: datetime | None
