from app.schemas import SeasonCreate, SeasonOut
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import Season
from app.database import get_db

router = APIRouter()

@router.get("/get/{season_id}")
def get_season(season_id: int, db: Session = Depends(get_db)):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    return season

@router.post("/create")
def create_season(season: SeasonCreate, db: Session = Depends(get_db)):


    new_season = Season(
        name=season.name,
        description = season.description)
    db.add(season)
    db.commit()
    db.refresh(season)
    return SeasonOut.from_orm(new_season)

@router.get("/get")
def get_all_seasons(db: Session = Depends(get_db)):
    return db.query(Season).all()

@router.delete("/delete/{season_id}")
def delete_season(season_id: int, db: Session = Depends(get_db)):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    db.delete(season)
    db.commit()
    return {"detail": "Season deleted"}