from sqlalchemy import Column, Integer, String, ForeignKey, JSON
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

# NPC model
class NPC(Base):
    __tablename__ = "npcs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    stats = Column(JSON)
    background_id = Column("Integer", ForeignKey('character_backgrounds.id'))
    background = relationship("CharacterBackground", back_populates="npcs")
    motivation = Column(String)
    quote = Column(JSON)
    ideals = Column(JSON)
    quirks = Column(JSON)
    faction_id = Column(Integer, ForeignKey('factions.id'))
    
    faction = relationship("Faction", back_populates="npcs")

# Faction model
class Faction(Base):
    __tablename__ = "factions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    goal = Column(String)

    backgrounds = relationship("CharacterBackground", back_populates="faction" )
    npcs = relationship("NPC", back_populates="faction" )

# StoryArc model
class StoryArc(Base):
    __tablename__ = "story_arcs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String)
    goal = Column(String)
    seasons = relationship("Season", back_populates="story_arcs")

# Season model
class Season(Base):
    __tablename__ = "seasons"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String)
    story_arc_id = Column(Integer, ForeignKey('story_arcs.id'))
    
    story_arcs = relationship("StoryArc", back_populates="seasons")
    episodes = relationship("Episode", back_populates="season")


# Episode model
class Episode(Base):
    __tablename__ = "episodes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String)
    story_goal = Column(String)
    mechanics_goal = Column(String)
    
    season_id = Column(Integer, ForeignKey('seasons.id'))
    
    season = relationship("Season", back_populates="episodes")

# Creature model
class Creature(Base):
    __tablename__ = "creatures"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    habitat = Column(String)
    frequency = Column(String)
    is_nocturnal = Column(String)
    terrain = Column(String)
    stats = Column(JSON)

# CustomRace model
class CustomRace(Base):
    __tablename__ = "custom_races"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String)

# CharacterBackground model
class CharacterBackground(Base):
    __tablename__ = "character_backgrounds"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    starting_equipment = Column(String)
    stat_modifications = Column(String)
    skills = Column(String)
    tools = Column(String)
    faction_id = Column(Integer, ForeignKey('factions.id'))

    npcs = relationship("NPC", back_populates="background")
    faction = relationship("Faction", back_populates="backgrounds")

# Map model (new addition)
class Map(Base):
    __tablename__ = "maps"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String)
    image_url = Column(String)
    
    areas = relationship("MapArea", back_populates="map")

# MapArea model (new addition)
class MapArea(Base):
    __tablename__ = "map_areas"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String)
    coordinates = Column(String)  # For storing area coordinates, e.g., "x,y"
    map_id = Column(Integer, ForeignKey('maps.id'))
    
    map = relationship("Map", back_populates="areas")
