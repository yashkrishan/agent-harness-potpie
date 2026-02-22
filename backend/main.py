from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Developer Build Agent API")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    from database import init_db
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth router
from backend.routers import auth
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Developer Build Agent API", "version": "1.0.0"}
