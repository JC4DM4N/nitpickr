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
    is_expired: bool
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
    is_expired: bool
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
    owner_username: str
    tested_platform: str | None
    test_duration: str | None
    created_account: bool | None
    is_exchange: bool


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


class UserCard(BaseModel):
    id: int
    username: str
    app_count: int
    reviews_given: int
    reviewer_rating: float | None


class UserProfile(BaseModel):
    id: int
    username: str
    available_credits: int
    twitter_username: str | None


class UserPatch(BaseModel):
    username: str | None = None
    twitter_username: str | None = None


class MessageOut(BaseModel):
    id: int
    review_id: int
    sender_id: int
    sender_username: str
    body: str
    created_at: datetime


class MessageCreate(BaseModel):
    body: str


class AppReviewFeedItem(BaseModel):
    id: int
    reviewer_username: str
    feedback: str | None
    is_submitted: bool
    is_complete: bool
    is_rejected: bool
    is_expired: bool
    review_requested: bool
    created_date: datetime
    reviewer_deadline: datetime | None
    owner_deadline: datetime | None


class ExchangeOut(BaseModel):
    id: int
    requester_id: int
    requestee_id: int
    requester_username: str
    requestee_username: str
    requester_app_id: int
    requester_app_name: str
    requester_app_initials: str
    requester_app_color: str
    requestee_app_id: int | None
    requestee_app_name: str | None
    requestee_app_initials: str | None
    requestee_app_color: str | None
    review_of_requester: int | None
    review_of_requestee: int | None
    # Status fields for each review (populated when accepted)
    ror_is_submitted: bool | None
    ror_is_complete: bool | None
    ror_is_rejected: bool | None
    ror_is_expired: bool | None
    ror_review_requested: bool | None
    rod_is_submitted: bool | None
    rod_is_complete: bool | None
    rod_is_rejected: bool | None
    rod_is_expired: bool | None
    rod_review_requested: bool | None
    status: str
    message: str | None
    created_at: datetime
    expires_at: datetime


class ExchangeCreate(BaseModel):
    requestee_username: str
    requester_app_id: int
    message: str | None = None


class ExchangeAccept(BaseModel):
    requestee_app_id: int


class ReviewReceived(BaseModel):
    id: int
    app_id: int
    app_name: str
    app_initials: str
    app_color: str
    app_stage: str
    app_url: str
    reviewer_username: str
    is_submitted: bool
    is_complete: bool
    is_rejected: bool
    is_expired: bool
    review_requested: bool
    created_date: datetime
    reviewer_deadline: datetime | None
    owner_deadline: datetime | None
