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
