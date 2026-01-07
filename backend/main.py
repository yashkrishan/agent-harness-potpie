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

# Import routers
from routers import projects, repos, prd as plan_router, tasks, design, execution, testing, pr

app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(repos.router, prefix="/api/repos", tags=["repos"])
app.include_router(plan_router.router, prefix="/api/plan", tags=["plan"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(design.router, prefix="/api/design", tags=["design"])
app.include_router(execution.router, prefix="/api/execution", tags=["execution"])
app.include_router(testing.router, prefix="/api/testing", tags=["testing"])
app.include_router(pr.router, prefix="/api/pr", tags=["pr"])

@app.get("/")
async def root():
    return {"message": "Developer Build Agent API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
