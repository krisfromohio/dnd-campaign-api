from app.schemas import StoryArcCreate, StoryArcOut
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import StoryArc
from app.database import get_db

router = APIRouter()

@router.get("/get/{story_arc_id}")
def get_story_arc(story_arc_id: int, db: Session = Depends(get_db)):
    story_arc = db.query(StoryArc).filter(StoryArc.id == story_arc_id).first()
    if not story_arc:
        raise HTTPException(status_code=404, detail="Story Arc not found")
    return story_arc

@router.post("/create")
def create_story_arc(story_arc: StoryArcCreate, db: Session = Depends(get_db)):
    new_story_arc = StoryArc(
        name=story_arc.name,
        goal=story_arc.goal,
        description = story_arc.description)
    db.add(story_arc)
    db.commit()
    db.refresh(story_arc)
    return StoryArcOut.from_orm(new_story_arc)





@router.get("/get/")
def get_all_story_arcs(db: Session = Depends(get_db)):
    return db.query(StoryArc).all()

@router.delete("/delete/{story_arc_id}")
def delete_story_arc(story_arc_id: int, db: Session = Depends(get_db)):
    story_arc = db.query(StoryArc).filter(StoryArc.id == story_arc_id).first()
    if not story_arc:
        raise HTTPException(status_code=404, detail="Story Arc not found")
    db.delete(story_arc)
    db.commit()
    return {"detail": "Story Arc deleted"}