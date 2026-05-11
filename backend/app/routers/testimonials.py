from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db

router = APIRouter(prefix="/testimonials", tags=["testimonials"])


@router.get("/{testimonial_id}")
def get_testimonial(testimonial_id: int, db: Session = Depends(get_db)):
    testimonial = (
        db.query(models.Testimonial)
        .filter(models.Testimonial.id == testimonial_id)
        .first()
    )
    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    app = db.query(models.App).filter(models.App.id == testimonial.app_id).first()
    return {
        "id": testimonial.id,
        "review_id": testimonial.review_id,
        "app_id": testimonial.app_id,
        "app_name": app.name if app else "",
        "quote_text": testimonial.quote_text,
        "created_at": testimonial.created_at.isoformat(),
    }
