# backend/agents/agent_1_perception/schemas.py
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ProfileResponse(BaseModel):
    user_id: str
    name: Optional[str]
    email: Optional[str]
    resume_url: Optional[str]
    skills: List[str]
    experience_summary: Optional[str]

class GithubSyncRequest(BaseModel):
    user_id: str # Now we use user_id, not session_id (Autonomy requirement)
    github_url: str

class WatchdogRequest(BaseModel):
    user_id: str
    last_known_sha: Optional[str] = None