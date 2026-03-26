from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/apps", tags=["apps"])


@router.get("/", response_model=List[schemas.AppOut])
def list_apps(db: Session = Depends(get_db)):
    return db.query(models.App).order_by(models.App.id).all()


@router.get("/{app_id}", response_model=schemas.AppOut)
def get_app(app_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    app = db.query(models.App).filter(models.App.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    return app
