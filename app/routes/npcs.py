from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import NPC
from app.database import get_db
from app.schemas import NPCBase, NPCCreate, NPCOut
from pydantic import BaseModel, ConfigDict, StringConstraints
router = APIRouter()

@router.get("/get/{npc_id}")
def get_npc(npc_id: int, db: Session = Depends(get_db)):
    npc = db.query(NPC).filter(NPC.id == npc_id).first()
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found: " + str(npc_id) )
    return npc



@router.get("/get")
def get_all_npcs(db: Session = Depends(get_db)):
    return db.query(NPC).all()

@router.delete("/delete/{npc_id}")
def delete_npc(npc_id: int, db: Session = Depends(get_db)):
    npc = db.query(NPC).filter(NPC.id == npc_id).first()
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")
    db.delete(npc)
    db.commit()
    return {"detail": "NPC deleted"}

@router.post("/create", response_model=NPCOut)
def create_npc(npc: NPCCreate, db: Session = Depends(get_db)):
    # Create a new NPC instance using the SQLAlchemy model
    new_npc = NPC(
        name=npc.name,
        stats=npc.stats,
        motivation=npc.motivation,
        quote=npc.quote,
        ideals=npc.ideals,
        quirks=npc.quirks,
        faction_id=npc.faction_id
    )
    # Add the new NPC to the database
    db.add(new_npc)
    db.commit()
    db.refresh(new_npc)
    
    # Return the SQLAlchemy object as a Pydantic model
    return NPCOut.from_orm(new_npc)