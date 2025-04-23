from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI()

# Allow React frontend on port 3000 during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routes import npcs
app.include_router(npcs.router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "Welcome to the D&D Campaign Manager API!"}
