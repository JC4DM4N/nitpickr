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
    views: int
    feedbacks: int
    credits: int

    model_config = {"from_attributes": True}


class ReviewOut(BaseModel):
    id: int
    app_id: int
    reviewer_id: int
    is_complete: bool
    created_date: datetime
    app_name: str
    app_initials: str
    app_color: str
    app_stage: str
    app_url: str


class ReviewDetail(BaseModel):
    id: int
    app_id: int
    is_complete: bool
    created_date: datetime
    app_name: str
    app_initials: str
    app_color: str
    app_stage: str
    app_url: str
    app_description: str
    app_request: str
    feedback: str | None
    screenshots: list[str]


class ReviewPatch(BaseModel):
    feedback: str | None = None
    is_complete: bool | None = None


class AppReviewFeedItem(BaseModel):
    id: int
    reviewer_username: str
    feedback: str | None
    is_complete: bool
    created_date: datetime
