from typing import List, Optional

class StoryObjective:
    def __init__(self, description: str):
        self.description = description

class MechanicObjective:
    def __init__(self, description: str):
        self.description = description

class Episode:
    def __init__(self, title: str, story_objective: StoryObjective, mechanic_objective: MechanicObjective):
        self.title = title
        self.story_objective = story_objective
        self.mechanic_objective = mechanic_objective

class Season:
    def __init__(self, title: str, episodes: List[Episode]):
        self.title = title
        self.episodes = episodes

class MapArea:
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

class Map:
    def __init__(self, title: str, image_path: str, areas: List[MapArea]):
        self.title = title
        self.image_path = image_path
        self.areas = areas

class Faction:
    def __init__(self, name: str, goals: str, influence: str):
        self.name = name
        self.goals = goals
        self.influence = influence

class NPC:
    def __init__(self, name: str, background: str, motivations: str, quote: str, ideals: str, quirks: str):
        self.name = name
        self.background = background
        self.motivations = motivations
        self.quote = quote
        self.ideals = ideals
        self.quirks = quirks

class Creature:
    def __init__(self, name: str, terrain: str, frequency: str, is_nocturnal: bool):
        self.name = name
        self.terrain = terrain
        self.frequency = frequency
        self.is_nocturnal = is_nocturnal

class CharacterBackground:
    def __init__(self, name: str, equipment: List[str], stat_mods: dict, skills: List[str], tools: List[str], associated_faction: Optional[Faction] = None):
        self.name = name
        self.equipment = equipment
        self.stat_mods = stat_mods
        self.skills = skills
        self.tools = tools
        self.associated_faction = associated_faction

class CustomRace:
    def __init__(self, name: str, traits: dict):
        self.name = name
        self.traits = traits

class CustomClass:
    def __init__(self, name: str, abilities: List[str]):
        self.name = name
        self.abilities = abilities

class CustomItem:
    def __init__(self, name: str, description: str, magical: bool):
        self.name = name
        self.description = description
        self.magical = magical

class CustomSpell:
    def __init__(self, name: str, effect: str, level: int):
        self.name = name
        self.effect = effect
        self.level = level
