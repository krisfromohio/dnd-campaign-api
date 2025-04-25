from app.models import CharacterBackground
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routes import npcs, character_background, creature,custom_race,episode,faction,season,story_arc   # Keep your existing routes

app = FastAPI()

# CORS Middleware - Allow React frontend on port 3000 during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include existing API routes
app.include_router(npcs.router, prefix="/api/npcs")
app.include_router(character_background.router, prefix="/api/character_background")
app.include_router(episode.router, prefix="/api/episode")
app.include_router(faction.router, prefix="/api/faction")
app.include_router(season.router, prefix="/api/season")
app.include_router(story_arc.router, prefix="/api/story_arc")
app.include_router(custom_race.router, prefix="/api/custom_race")


# Serve React static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
def serve_root():
    """Serve the React app's entry point (index.html)."""
    return FileResponse("app/static/index.html")

@app.get("/{path:path}")
def serve_react_routes(path: str):
    """Catch-all route to serve React's index.html for client-side routing."""
    return FileResponse("app/static/index.html")