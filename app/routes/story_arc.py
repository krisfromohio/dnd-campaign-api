from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import StoryArc
from app.database import get_db

router = APIRouter()

@router.get("/{story_arc_id}")
def get_story_arc(story_arc_id: int, db: Session = Depends(get_db)):
    story_arc = db.query(StoryArc).filter(StoryArc.id == story_arc_id).first()
    if not story_arc:
        raise HTTPException(status_code=404, detail="Story Arc not found")
    return story_arc

@router.post("/")
def create_story_arc(story_arc: StoryArc, db: Session = Depends(get_db)):
    db.add(story_arc)
    db.commit()
    db.refresh(story_arc)
    return story_arc

@router.get("/")
def get_all_story_arcs(db: Session = Depends(get_db)):
    return db.query(StoryArc).all()

@router.delete("/{story_arc_id}")
def delete_story_arc(story_arc_id: int, db: Session = Depends(get_db)):
    story_arc = db.query(StoryArc).filter(StoryArc.id == story_arc_id).first()
    if not story_arc:
        raise HTTPException(status_code=404, detail="Story Arc not found")
    db.delete(story_arc)
    db.commit()
    return {"detail": "Story Arc deleted"}