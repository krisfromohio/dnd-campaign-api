from app.schemas import CharacterBackgroundCreate, CharacterBackgroundOut
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
def create_character_background(background: CharacterBackgroundCreate, db: Session = Depends(get_db)):


    new_background = CharacterBackground(
        name=background.name,
        starting_equipment=background.starting_equipment,
        skills = background.skills,
        tools = background.tools,
        faction_id = background.faction_id,
        stat_modifications = background.stat_modifications)
    db.add(background)
    db.commit()
    db.refresh(background)
    return CharacterBackgroundOut.from_orm(new_background)

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