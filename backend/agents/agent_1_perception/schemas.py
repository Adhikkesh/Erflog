# backend/agents/agent_1_perception/schemas.py
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


# =============================================================================
# Skill Metadata Models (Part 3: Verification Layer)
# =============================================================================

class SkillMetadata(BaseModel):
    """Rich skill profile with verification status"""
    source: str  # "resume", "github", "quiz", "manual"
    verification_status: str = "pending"  # "pending", "verified", "rejected"
    level: Optional[str] = None  # "beginner", "intermediate", "advanced", "expert"
    evidence: Optional[str] = None  # Description of how skill was detected
    last_seen: Optional[str] = None  # ISO timestamp of last detection


class ProfileResponse(BaseModel):
    """Response model for user profile"""
    user_id: str
    name: Optional[str]
    email: Optional[str]
    resume_url: Optional[str]
    skills: List[str]  # Legacy array for backward compatibility
    skills_metadata: Dict[str, SkillMetadata] = {}  # Rich skill profiles
    experience_summary: Optional[str]


# =============================================================================
# Quiz Models (Skill Verification)
# =============================================================================

class QuizRequest(BaseModel):
    """Request to generate a skill verification quiz"""
    skill_name: str  # e.g., "React", "Python"
    level: Optional[str] = "intermediate"  # Difficulty level


class QuizResponse(BaseModel):
    """Generated quiz question"""
    quiz_id: str  # Unique ID to track this quiz attempt
    skill_name: str
    question: str
    options: List[str]  # 4 options (A, B, C, D)
    # Note: correct_index is NOT sent to frontend for security
    # In stateless mode, we include it encrypted or trust client


class QuizSubmission(BaseModel):
    """User's answer submission"""
    quiz_id: str
    skill_name: str
    answer_index: int  # 0-3 corresponding to options
    # For stateless verification, client sends expected answer
    expected_correct_index: Optional[int] = None


class QuizResult(BaseModel):
    """Result of quiz verification"""
    correct: bool
    new_status: str  # "verified" or "pending"
    message: str


# =============================================================================
# GitHub Sync Models
# =============================================================================

class GithubSyncResponse(BaseModel):
    """Response from GitHub sync operation"""
    updated_skills: List[str]
    skills_metadata: Dict[str, Any] = {}
    analysis: Optional[Dict[str, Any]] = None


# =============================================================================
# Onboarding Models
# =============================================================================

class OnboardingRequest(BaseModel):
    """Request body for user onboarding - all fields optional"""
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    target_roles: Optional[List[str]] = None


class OnboardingResponse(BaseModel):
    """Response from onboarding update"""
    status: str
    updated_fields: List[str]
    user_id: str


# =============================================================================
# Watchdog Models
# =============================================================================

class WatchdogCheckRequest(BaseModel):
    """Request for watchdog polling (used by frontend)"""
    last_known_sha: Optional[str] = None
