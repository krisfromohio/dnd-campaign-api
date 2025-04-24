from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import CharacterBackground
from app.database import get_db

router = APIRouter()

@router.get("/{background_id}")
def get_character_background(background_id: int, db: Session = Depends(get_db)):
    background = db.query(CharacterBackground).filter(CharacterBackground.id == background_id).first()
    if not background:
        raise HTTPException(status_code=404, detail="Character Background not found")
    return background

@router.post("/")
def create_character_background(background: CharacterBackground, db: Session = Depends(get_db)):
    db.add(background)
    db.commit()
    db.refresh(background)
    return background

@router.get("/")
def get_all_character_backgrounds(db: Session = Depends(get_db)):
    return db.query(CharacterBackground).all()

@router.delete("/{background_id}")
def delete_character_background(background_id: int, db: Session = Depends(get_db)):
    background = db.query(CharacterBackground).filter(CharacterBackground.id == background_id).first()
    if not background:
        raise HTTPException(status_code=404, detail="Character Background not found")
    db.delete(background)
    db.commit()
    return {"detail": "Character Background deleted"}