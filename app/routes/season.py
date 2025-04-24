from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import Season
from app.database import get_db

router = APIRouter()

@router.get("/{season_id}")
def get_season(season_id: int, db: Session = Depends(get_db)):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    return season

@router.post("/")
def create_season(season: Season, db: Session = Depends(get_db)):
    db.add(season)
    db.commit()
    db.refresh(season)
    return season

@router.get("/")
def get_all_seasons(db: Session = Depends(get_db)):
    return db.query(Season).all()

@router.delete("/{season_id}")
def delete_season(season_id: int, db: Session = Depends(get_db)):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    db.delete(season)
    db.commit()
    return {"detail": "Season deleted"}