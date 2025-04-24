# seed_data.py
from app.database import SessionLocal, engine, Base
from app.models import (
    NPC, Faction, StoryArc,
    Season, Episode, Creature,
    CustomRace, CharacterBackground,
    Map, MapArea
)

def seed():
    # Recreate all tables (warning: this wipes existing data!)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # --- Factions ---
    iron_ring = Faction(name="Iron Ring", goal="Dominate the underworld")
    silver_hand = Faction(name="Silver Hand", goal="Protect the innocent")
    db.add_all([iron_ring, silver_hand])
    db.flush()  # to get IDs

    # --- NPCs ---
    db.add_all([
        NPC(
            name="Ghavena",
            stats={"Strength": 18, "Dexterity": 12, "Constitution": 14},
            background_id=None,  # Updated to match ForeignKey relationship
            motivation="Seize power",
            quote=["None shall stand before me!"],  # Fixed to match JSON type
            ideals=["Strength above all"],  # Fixed to match JSON type
            quirks=["Laughs in battle", "Clenches fist when angry"],  # Fixed to match JSON type
            faction_id=iron_ring.id
        ),
        NPC(
            name="Elowen",
            stats={"Wisdom": 16, "Dexterity": 14, "Constitution": 12},
            background_id=None,  # Updated to match ForeignKey relationship
            motivation="Restore balance",
            quote=["The woods whisper to me."],  # Fixed to match JSON type
            ideals=["Harmony with nature"],  # Fixed to match JSON type
            quirks=["Talks to animals"],  # Fixed to match JSON type
            faction_id=silver_hand.id
        ),
    ])

    # --- Story Arcs / Seasons / Episodes ---
    arc = StoryArc(name="Rise of Shadows", description="Darkness stirs in the east", goal="Unite the factions")
    db.add(arc); db.flush()

    season1 = Season(
        name="Shadows Gather",
        description="Strange happenings",
        story_arc_id=arc.id
    )
    db.add(season1); db.flush()

    db.add(Episode(
        name="Whispers in the Dark",
        description="Hear the rumors",
        season_id=season1.id,
        story_goal="Introduce Ghavena",
        mechanics_goal="Party finds first clue"
    ))

    # --- Creatures ---
    db.add(Creature(
        name="Nightstalker",
        habitat="Forest",
        frequency="Rare",
        is_nocturnal="True",  # Fixed to match String type
        terrain="Dense woods",
        stats={"HP": 45, "AC": 15}
    ))

    # --- Custom Races & Backgrounds ---
    db.add(CustomRace(name="Stonekin", description="Rocky humanoids"))
    db.add(CharacterBackground(
        name="Blacksmith’s Apprentice",
        starting_equipment="Hammer, Tongs",
        stat_modifications="STR+1",
        skills="Smith’s Tools",
        tools="Forge Tools",
        faction_id=None  # Updated to match ForeignKey relationship
    ))

    # --- Maps & Areas ---
    world_map = Map(
        name="Ebonreach",
        description="The broken lands",
        image_url="https://example.com/maps/ebonreach.png"
    )
    db.add(world_map); db.flush()

    db.add_all([
        MapArea(
            name="Ruined Keep",
            description="Old fortress overrun by creatures",
            coordinates="34,78",
            map_id=world_map.id
        ),
        MapArea(
            name="Whispering Woods",
            description="Trees murmur at night",
            coordinates="56,102",
            map_id=world_map.id
        ),
    ])

    db.commit()
    db.close()
    print("✅ Database has been seeded with test data.")

if __name__ == "__main__":
    seed()