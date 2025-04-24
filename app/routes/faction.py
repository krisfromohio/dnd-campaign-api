from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import Faction
from app.database import get_db

router = APIRouter()

@router.get("/{faction_id}")
def get_faction(faction_id: int, db: Session = Depends(get_db)):
    faction = db.query(Faction).filter(Faction.id == faction_id).first()
    if not faction:
        raise HTTPException(status_code=404, detail="Faction not found")
    return faction

@router.post("/")
def create_faction(faction: Faction, db: Session = Depends(get_db)):
    db.add(faction)
    db.commit()
    db.refresh(faction)
    return faction

@router.get("/")
def get_all_factions(db: Session = Depends(get_db)):
    return db.query(Faction).all()

@router.delete("/{faction_id}")
def delete_faction(faction_id: int, db: Session = Depends(get_db)):
    faction = db.query(Faction).filter(Faction.id == faction_id).first()
    if not faction:
        raise HTTPException(status_code=404, detail="Faction not found")
    db.delete(faction)
    db.commit()
    return {"detail": "Faction deleted"}