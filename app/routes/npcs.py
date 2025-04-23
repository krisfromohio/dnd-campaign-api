from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, crud

router = APIRouter()

@router.get("/npcs/", response_model=List[schemas.NPCOut])
def read_npcs(db: Session = Depends(get_db)):
    return crud.get_all_objects(db, models.NPC)
