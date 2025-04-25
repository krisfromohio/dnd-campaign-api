from fastapi import APIRouter, HTTPException, Depends
from app.schemas import EpisodeCreate, EpisodeOut
from sqlalchemy.orm import Session
from app.models import Episode
from app.database import get_db

router = APIRouter()

@router.get("/get/{episode_id}")
def get_episode(episode_id: int, db: Session = Depends(get_db)):
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    return episode

@router.post("/create")
def create_season(episode: EpisodeCreate, db: Session = Depends(get_db)):

    new_episode = Episode(
        name=episode.name,
        story_goal = episode.story_goal,
        mechanics_goal = episode.mechanics_goal,
        description = episode.description)
    db.add(episode)
    db.commit()
    db.refresh(episode)
    return EpisodeOut.from_orm(new_episode)


@router.get("/get/")
def get_all_episodes(db: Session = Depends(get_db)):
    return db.query(Episode).all()

@router.delete("/delete/{episode_id}")
def delete_episode(episode_id: int, db: Session = Depends(get_db)):
    episode = db.query(Episode).filter(Episode.id == episode_id).first()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    db.delete(episode)
    db.commit()
    return {"detail": "Episode deleted"}