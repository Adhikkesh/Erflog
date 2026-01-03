# backend/agents/agent_1_perception/router.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from .service import agent1_service
from .schemas import ProfileResponse, GithubSyncRequest

router = APIRouter(prefix="/api/perception", tags=["Agent 1: Perception"])

@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...), 
    user_id: str = Form(...) # If using Auth, extract this from Token instead
):
    """
    HTTP Trigger for Resume Processing
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files allowed")
    
    try:
        # Call the Decoupled Service
        result = await agent1_service.process_resume_upload(file, user_id)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/sync-github")
async def sync_github(request: GithubSyncRequest):
    """
    HTTP Trigger for GitHub Sync
    """
    try:
        result = await agent1_service.run_github_watchdog(request.user_id, request.github_url)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(500, str(e))