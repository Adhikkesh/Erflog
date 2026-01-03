# backend/agents/agent_1_perception/schemas.py
from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any


class ProfileResponse(BaseModel):
    user_id: str
    name: Optional[str]
    email: Optional[str]
    resume_url: Optional[str]
    skills: List[str]
    experience_summary: Optional[str]


class GithubSyncResponse(BaseModel):
    """Response from GitHub sync operation"""
    updated_skills: List[str]
    analysis: Optional[Dict[str, Any]] = None


class OnboardingRequest(BaseModel):
    """Request body for user onboarding - all fields optional"""
    github_url: Optional[str] = None  # e.g., https://github.com/username
    linkedin_url: Optional[str] = None  # e.g., https://linkedin.com/in/username
    target_roles: Optional[List[str]] = None  # e.g., ["Software Engineer", "ML Engineer"]


class OnboardingResponse(BaseModel):
    """Response from onboarding update"""
    status: str
    updated_fields: List[str]
    user_id: str


class WatchdogCheckRequest(BaseModel):
    """Request for watchdog polling (used by frontend)"""
    last_known_sha: Optional[str] = None
