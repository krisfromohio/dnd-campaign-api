from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import CustomRace
from app.database import get_db

router = APIRouter()

@router.get("/{custom_race_id}")
def get_custom_race(custom_race_id: int, db: Session = Depends(get_db)):
    custom_race = db.query(CustomRace).filter(CustomRace.id == custom_race_id).first()
    if not custom_race:
        raise HTTPException(status_code=404, detail="Custom Race not found")
    return custom_race

@router.post("/")
def create_custom_race(custom_race: CustomRace, db: Session = Depends(get_db)):
    db.add(custom_race)
    db.commit()
    db.refresh(custom_race)
    return custom_race

@router.get("/")
def get_all_custom_races(db: Session = Depends(get_db)):
    return db.query(CustomRace).all()

@router.delete("/{custom_race_id}")
def delete_custom_race(custom_race_id: int, db: Session = Depends(get_db)):
    custom_race = db.query(CustomRace).filter(CustomRace.id == custom_race_id).first()
    if not custom_race:
        raise HTTPException(status_code=404, detail="Custom Race not found")
    db.delete(custom_race)
    db.commit()
    return {"detail": "Custom Race deleted"}