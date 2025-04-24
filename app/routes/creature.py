from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import Creature
from app.database import get_db

router = APIRouter()

@router.get("/{creature_id}")
def get_creature(creature_id: int, db: Session = Depends(get_db)):
    creature = db.query(Creature).filter(Creature.id == creature_id).first()
    if not creature:
        raise HTTPException(status_code=404, detail="Creature not found")
    return creature

@router.post("/")
def create_creature(creature: Creature, db: Session = Depends(get_db)):
    db.add(creature)
    db.commit()
    db.refresh(creature)
    return creature

@router.get("/")
def get_all_creatures(db: Session = Depends(get_db)):
    return db.query(Creature).all()

@router.delete("/{creature_id}")
def delete_creature(creature_id: int, db: Session = Depends(get_db)):
    creature = db.query(Creature).filter(Creature.id == creature_id).first()
    if not creature:
        raise HTTPException(status_code=404, detail="Creature not found")
    db.delete(creature)
    db.commit()
    return {"detail": "Creature deleted"}