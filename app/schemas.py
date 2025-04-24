from pydantic import BaseModel
from typing import Optional, List, Dict, Union

# ——— NPC Schemas ———
class NPCBase(BaseModel):
    name: str
    background: Optional[str]
    motivation: Optional[str]
    quote: Union[List[str], Dict]
    ideals: Union[List[str], Dict]
    quirks: Union[List[str], Dict]       
    faction_id: Optional[int]

class NPCCreate(NPCBase):
    pass

class NPCOut(NPCBase):
    id: int

    class Config:
        orm_mode = True


# ——— Faction Schemas ———
class FactionBase(BaseModel):
    name: str
    goal: Optional[str]

class FactionCreate(FactionBase):
    pass

class FactionOut(FactionBase):
    id: int

    class Config:
        orm_mode = True


# ——— StoryArc Schemas ———
class StoryArcBase(BaseModel):
    name: str
    description: Optional[str]
    goal: Optional[str]

class StoryArcCreate(StoryArcBase):
    pass

class StoryArcOut(StoryArcBase):
    id: int

    class Config:
        orm_mode = True


# ——— Season Schemas ———
class SeasonBase(BaseModel):
    name: str
    description: Optional[str]
    story_arc_id: int
    story_objective: Optional[str]
    mechanic_objective: Optional[str]

class SeasonCreate(SeasonBase):
    pass

class SeasonOut(SeasonBase):
    id: int

    class Config:
        orm_mode = True


# ——— Episode Schemas ———
class EpisodeBase(BaseModel):
    name: str
    description: Optional[str]
    season_id: int
    story_objective: Optional[str]
    mechanic_objective: Optional[str]
    linked_factions: Optional[List[int]]
    linked_npcs: Optional[List[int]]
    linked_creatures: Optional[List[int]]
    locations: Optional[List[str]]
    tags: Optional[List[str]]

class EpisodeCreate(EpisodeBase):
    pass

class EpisodeOut(EpisodeBase):
    id: int

    class Config:
        orm_mode = True


# ——— Creature Schemas ———
class CreatureBase(BaseModel):
    name: str
    habitat: Optional[str]
    frequency: Optional[str]
    is_nocturnal: Optional[bool]
    terrain: Optional[str]
    stats: Optional[Dict[str, int]]
    tags: Optional[List[str]]

class CreatureCreate(CreatureBase):
    pass

class CreatureOut(CreatureBase):
    id: int

    class Config:
        orm_mode = True


# ——— CustomRace Schemas ———
class CustomRaceBase(BaseModel):
    name: str
    description: Optional[str]
    traits: Optional[Dict[str, str]]
    tags: Optional[List[str]]

class CustomRaceCreate(CustomRaceBase):
    pass

class CustomRaceOut(CustomRaceBase):
    id: int

    class Config:
        orm_mode = True


# ——— CharacterBackground Schemas ———
class CharacterBackgroundBase(BaseModel):
    name: str
    starting_equipment: Optional[List[str]]
    stat_modifications: Optional[Dict[str, int]]
    skills: Optional[List[str]]
    tools: Optional[List[str]]
    associated_factions: Optional[List[int]]
    tags: Optional[List[str]]

class CharacterBackgroundCreate(CharacterBackgroundBase):
    pass

class CharacterBackgroundOut(CharacterBackgroundBase):
    id: int

    class Config:
        orm_mode = True


# ——— Map & MapArea Schemas ———
class MapAreaBase(BaseModel):
    name: str
    description: Optional[str]
    coordinates: Optional[str]

class MapAreaCreate(MapAreaBase):
    map_id: int

class MapAreaOut(MapAreaBase):
    id: int
    map_id: int

    class Config:
        orm_mode = True

class MapBase(BaseModel):
    name: str
    description: Optional[str]
    image_url: Optional[str]
    tags: Optional[List[str]]

class MapCreate(MapBase):
    pass

class MapOut(MapBase):
    id: int
    areas: Optional[List[MapAreaOut]]

    class Config:
        orm_mode = True


# ——— CustomClass, CustomItem, CustomSpell Schemas ———
class CustomClassBase(BaseModel):
    name: str
    abilities: Optional[List[str]]
    tags: Optional[List[str]]

class CustomClassCreate(CustomClassBase):
    pass

class CustomClassOut(CustomClassBase):
    id: int

    class Config:
        orm_mode = True

class CustomItemBase(BaseModel):
    name: str
    type: Optional[str]
    rarity: Optional[str]
    attunement: Optional[bool]
    description: Optional[str]
    properties: Optional[Dict[str, str]]
    tags: Optional[List[str]]

class CustomItemCreate(CustomItemBase):
    pass

class CustomItemOut(CustomItemBase):
    id: int

    class Config:
        orm_mode = True

class CustomSpellBase(BaseModel):
    name: str
    level: Optional[int]
    school: Optional[str]
    casting_time: Optional[str]
    range: Optional[str]
    components: Optional[List[str]]
    duration: Optional[str]
    description: Optional[str]
    effects: Optional[Dict[str, str]]
    tags: Optional[List[str]]

class CustomSpellCreate(CustomSpellBase):
    pass

class CustomSpellOut(CustomSpellBase):
    id: int

    class Config:
        orm_mode = True
