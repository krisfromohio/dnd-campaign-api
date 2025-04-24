from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import NPC
from app.database import get_db

router = APIRouter()

@router.get("/{npc_id}")
def get_npc(npc_id: int, db: Session = Depends(get_db)):
    npc = db.query(NPC).filter(NPC.id == npc_id).first()
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")
    return npc

@router.post("/")
def create_npc(npc: NPC, db: Session = Depends(get_db)):
    db.add(npc)
    db.commit()
    db.refresh(npc)
    return npc

@router.get("/")
def get_all_npcs(db: Session = Depends(get_db)):
    return db.query(NPC).all()

@router.delete("/{npc_id}")
def delete_npc(npc_id: int, db: Session = Depends(get_db)):
    npc = db.query(NPC).filter(NPC.id == npc_id).first()
    if not npc:
        raise HTTPException(status_code=404, detail="NPC not found")
    db.delete(npc)
    db.commit()
    return {"detail": "NPC deleted"}