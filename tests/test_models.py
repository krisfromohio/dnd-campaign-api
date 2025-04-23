import pytest
from sqlalchemy.orm import Session
from app import models, crud

def generic_crud_asserts(db_obj, model_class, fetch_func, update_func, delete_func, update_field, update_value, fetch_id):
    # Read
    fetched = fetch_func(models, fetch_id)
    assert fetched is not None
    # Update
    updated = update_func(fetched, {update_field: update_value})
    assert getattr(updated, update_field) == update_value
    # Delete
    deleted = delete_func(updated)
    assert fetch_func(models, updated.id) is None

def test_faction_crud(db: Session):
    # Create
    data = {"name": "Faction1", "goal": "Goal1"}
    faction = crud.create_object(db, models.Faction, data)
    assert faction.id is not None

    # Read, Update, Delete
    fetched = crud.get_object_by_id(db, models.Faction, faction.id)
    assert fetched.name == data["name"]
    updated = crud.update_object(db, fetched, {"goal": "NewGoal"})
    assert updated.goal == "NewGoal"
    crud.delete_object(db, updated)
    assert crud.get_object_by_id(db, models.Faction, faction.id) is None

def test_npc_crud(db: Session):
    # Ensure a faction exists
    npcs_len = len(crud.get_all_objects(db, models.NPC))
    faction = crud.create_object(db, models.Faction, {"name": "F1", "goal": "G1"})
    background = crud.create_object(db, models.CharacterBackground, {"name": "BG1", "starting_equipment": "Sword", "stat_modifications": "STR+1", "skills": "Bow", "tools": "Lockpick", "faction_id": faction.id})
    # Create
    data = {
        "name": "NPC1", "stats": {"STR":18, "INT": 12}, "background_id": background.id, "motivation": "M", 
        "quote": "[Q]", "ideals": "[I]", "quirks": "[Qk]", "faction_id": faction.id
    }
    npc = crud.create_object(db, models.NPC, data)
    assert npc.id is not None
    npcs = crud.get_all_objects(db, models.NPC)
    assert len(npcs) == npcs_len + 1

    # Read
    fetched = crud.get_object_by_id(db, models.NPC, npc.id)
    assert fetched.name == data["name"]
    # Update
    updated = crud.update_object(db, fetched, {"name": "NPC2"})
    assert updated.name == "NPC2"
    # Delete
    crud.delete_object(db, updated)
    assert crud.get_object_by_id(db, models.NPC, npc.id) is None

def test_storyarc_crud(db: Session):
    data = {"name": "Arc1", "description": "Desc1", "goal": "G1"}
    arc = crud.create_object(db, models.StoryArc, data)
    assert arc.id is not None

    fetched = crud.get_object_by_id(db, models.StoryArc, arc.id)
    assert fetched.name == data["name"]
    updated = crud.update_object(db, fetched, {"description": "Desc2"})
    assert updated.description == "Desc2"
    crud.delete_object(db, updated)
    assert crud.get_object_by_id(db, models.StoryArc, arc.id) is None

def test_season_crud(db: Session):
    arc = crud.create_object(db, models.StoryArc, {"name": "Arc", "description": "Desc", "goal": "G"})
    data = {"name": "Season1", "description": "SDesc", "story_arc_id": arc.id}
    season = crud.create_object(db, models.Season, data)
    assert season.id is not None

    fetched = crud.get_object_by_id(db, models.Season, season.id)
    assert fetched.name == data["name"]
    updated = crud.update_object(db, fetched, {"description": "SDesc2"})
    assert updated.description == "SDesc2"
    crud.delete_object(db, updated)
    assert crud.get_object_by_id(db, models.Season, season.id) is None

def test_episode_crud(db: Session):
    arc = crud.create_object(db, models.StoryArc, {"name": "Arc", "description": "Desc", "goal": "G"})
    season = crud.create_object(db, models.Season, {"name": "Season", "description": "Desc", "story_arc_id": arc.id})
    data = {"name": "Episode1", "description": "EDesc", "season_id": season.id}
    episode = crud.create_object(db, models.Episode, data)
    assert episode.id is not None

    fetched = crud.get_object_by_id(db, models.Episode, episode.id)
    assert fetched.name == data["name"]
    updated = crud.update_object(db, fetched, {"description": "EDesc2"})
    assert updated.description == "EDesc2"
    crud.delete_object(db, updated)
    assert crud.get_object_by_id(db, models.Episode, episode.id) is None

def test_creature_crud(db: Session):
    data = {"name": "Beast", "habitat": "Forest", "frequency": "Common", "is_nocturnal": False, "terrain": "Forest", "stats": {"HP":10}}
    creature = crud.create_object(db, models.Creature, data)
    assert creature.id is not None

    fetched = crud.get_object_by_id(db, models.Creature, creature.id)
    assert fetched.habitat == data["habitat"]
    updated = crud.update_object(db, fetched, {"terrain": "Desert"})
    assert updated.terrain == "Desert"
    crud.delete_object(db, updated)
    assert crud.get_object_by_id(db, models.Creature, creature.id) is None

def test_customrace_crud(db: Session):
    data = {"name": "Race1", "description": "Desc"}
    race = crud.create_object(db, models.CustomRace, data)
    assert race.id is not None

    fetched = crud.get_object_by_id(db, models.CustomRace, race.id)
    assert fetched.description == data["description"]
    updated = crud.update_object(db, fetched, {"description": "Desc2"})
    assert updated.description == "Desc2"
    crud.delete_object(db, updated)
    assert crud.get_object_by_id(db, models.CustomRace, race.id) is None

def test_characterbackground_crud(db: Session):
    faction = crud.create_object(db, models.Faction, {"name":"F1","goal":"G1"})
    data = {"name": "BG1", "starting_equipment": "Sword", "stat_modifications": "STR+1", "skills": "Bow", "tools": "Lockpick", "faction_id": faction.id}
    bg = crud.create_object(db, models.CharacterBackground, data)
    assert bg.id is not None

    fetched = crud.get_object_by_id(db, models.CharacterBackground, bg.id)
    assert fetched.name == data["name"]
    updated = crud.update_object(db, fetched, {"skills": "Stealth"})
    assert updated.skills == "Stealth"
    crud.delete_object(db, updated)
    assert crud.get_object_by_id(db, models.CharacterBackground, bg.id) is None

def test_map_crud(db: Session):
    data = {"name": "Map1", "description": "MDesc", "image_url": "url"}
    m = crud.create_object(db, models.Map, data)
    assert m.id is not None

    fetched = crud.get_object_by_id(db, models.Map, m.id)
    assert fetched.name == data["name"]
    updated = crud.update_object(db, fetched, {"description": "MDesc2"})
    assert updated.description == "MDesc2"
    crud.delete_object(db, updated)
    assert crud.get_object_by_id(db, models.Map, m.id) is None

def test_maparea_crud(db: Session):
    m = crud.create_object(db, models.Map, {"name": "Map1", "description": "Desc", "image_url": "url"})
    data = {"name": "Area1", "description": "ADesc", "coordinates": "0,0", "map_id": m.id}
    area = crud.create_object(db, models.MapArea, data)
    assert area.id is not None
    area2 = crud.create_object(db, models.MapArea, {"name": "Area2", "description": "A 2 Desc", "coordinates": "0,0", "map_id": m.id})    
    assert area.id is not None

    fetched = crud.get_object_by_id(db, models.MapArea, area.id)
    assert fetched.name == data["name"]
    updated = crud.update_object(db, fetched, {"description": "ADesc2"})
    assert updated.description == "ADesc2"
    crud.delete_object(db, updated)
    assert crud.get_object_by_id(db, models.MapArea, area.id) is None
