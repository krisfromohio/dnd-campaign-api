from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import Episode
from app.database import get_db

router = APIRouter()

@router.get("/{episode_id}")
def get_episode(episode_id: int, db: Session = Depends(get_db)):
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    return episode

@router.post("/")
def create_episode(episode: Episode, db: Session = Depends(get_db)):
    db.add(episode)
    db.commit()
    db.refresh(episode)
    return episode

@router.get("/")
def get_all_episodes(db: Session = Depends(get_db)):
    return db.query(Episode).all()

@router.delete("/{episode_id}")
def delete_episode(episode_id: int, db: Session = Depends(get_db)):
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    db.delete(episode)
    db.commit()
    return {"detail": "Episode deleted"}