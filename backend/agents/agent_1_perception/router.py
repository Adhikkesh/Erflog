# backend/agents/agent_1_perception/router.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from auth.dependencies import get_current_user
from .service import agent1_service
from .schemas import (
    ProfileResponse, 
    GithubSyncResponse, 
    OnboardingRequest, 
    OnboardingResponse,
    WatchdogCheckRequest,
    QuizRequest,
    QuizResponse,
    QuizSubmission,
    QuizResult
)

router = APIRouter(prefix="/api/perception", tags=["Agent 1: Perception"])


# =============================================================================
# RESUME UPLOAD
# =============================================================================

@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...), 
    user: dict = Depends(get_current_user)
):
    """
    Upload and process resume (Protected)
    
    Extracts skills with metadata and stores in both:
    - skills: Legacy string array for backward compatibility
    - skills_metadata: Rich skill profiles with source and verification status
    """
    user_id = user["sub"]
    
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files allowed")
    
    try:
        result = await agent1_service.process_resume_upload(file, user_id)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(500, str(e))


# =============================================================================
# GITHUB SYNC
# =============================================================================

@router.post("/sync-github", response_model=dict)
async def sync_github(user: dict = Depends(get_current_user)):
    """
    Trigger GitHub sync (Protected)
    
    Scans user's GitHub activity and updates skills_metadata:
    - New skills: source="github", verification_status="pending"
    - Existing skills: Updates evidence and last_seen timestamp
    """
    user_id = user["sub"]
    
    try:
        result = await agent1_service.run_github_watchdog(user_id)
        
        if result is None:
            raise HTTPException(
                status_code=400, 
                detail="GitHub sync failed. Please ensure you have completed onboarding with a valid GitHub URL."
            )
        
        return {"status": "success", "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# =============================================================================
# ONBOARDING
# =============================================================================

@router.patch("/onboarding", response_model=OnboardingResponse)
async def update_onboarding(
    request: OnboardingRequest,
    user: dict = Depends(get_current_user)
):
    """
    Update user profile with onboarding information (Protected)
    
    Set github_url, linkedin_url, and target_roles.
    """
    user_id = user["sub"]
    
    try:
        result = await agent1_service.update_user_onboarding(
            user_id=user_id,
            github_url=request.github_url,
            linkedin_url=request.linkedin_url,
            target_roles=request.target_roles
        )
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


# =============================================================================
# WATCHDOG POLLING
# =============================================================================

@router.post("/watchdog/check")
async def watchdog_check(
    request: WatchdogCheckRequest,
    user: dict = Depends(get_current_user)
):
    """
    Poll for new GitHub activity (Protected)
    
    Efficient check using commit SHA comparison.
    Returns full analysis if new activity detected.
    """
    user_id = user["sub"]
    
    try:
        result = await agent1_service.check_github_activity(
            user_id=user_id,
            last_known_sha=request.last_known_sha
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# =============================================================================
# SKILL VERIFICATION: Quiz Endpoints
# =============================================================================

@router.post("/verify/quiz")
async def generate_verification_quiz(
    request: QuizRequest,
    user: dict = Depends(get_current_user)
):
    """
    Generate a skill verification quiz question (Protected)
    
    Creates a multiple-choice question to verify the user's knowledge
    of a specific skill. Returns quiz_id, question, and options.
    
    NOTE: In this stateless implementation, correct_index is included
    in the response. In production, store server-side and validate.
    """
    user_id = user["sub"]
    
    try:
        result = await agent1_service.generate_quiz(
            user_id=user_id,
            skill_name=request.skill_name,
            level=request.level or "intermediate"
        )
        
        if not result:
            raise HTTPException(500, "Failed to generate quiz")
        
        return {
            "status": "success",
            "quiz": {
                "quiz_id": result["quiz_id"],
                "skill_name": result["skill_name"],
                "question": result["question"],
                "options": result["options"],
                # Include correct_index for stateless verification
                # In production, this would be stored server-side
                "correct_index": result["correct_index"],
                "explanation": result.get("explanation", "")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/verify/submit", response_model=dict)
async def submit_quiz_answer(
    request: QuizSubmission,
    user: dict = Depends(get_current_user)
):
    """
    Submit quiz answer and update skill verification status (Protected)
    
    Compares user's answer with expected correct answer.
    If correct: Updates skills_metadata[skill].verification_status = "verified"
    If incorrect: Status remains unchanged (pending)
    
    Request body:
    - quiz_id: The quiz ID from generate_verification_quiz
    - skill_name: The skill being verified
    - answer_index: User's selected answer (0-3)
    - expected_correct_index: The correct answer index (for stateless verification)
    """
    user_id = user["sub"]
    
    try:
        # Stateless verification: compare answer_index with expected_correct_index
        # In production, you would look up the correct answer from a database
        passed = request.answer_index == request.expected_correct_index
        
        result = await agent1_service.verify_quiz_attempt(
            user_id=user_id,
            skill_name=request.skill_name,
            passed=passed
        )
        
        return {
            "status": "success",
            "result": {
                "correct": result["correct"],
                "new_status": result["new_status"],
                "message": result["message"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# =============================================================================
# PROFILE RETRIEVAL (Optional utility endpoint)
# =============================================================================

@router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    """
    Get current user's profile with skills metadata (Protected)
    """
    user_id = user["sub"]
    
    try:
        response = agent1_service.supabase.table("profiles").select(
            "user_id, name, email, skills, skills_metadata, resume_url, experience_summary"
        ).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(404, "Profile not found. Please upload your resume first.")
        
        profile = response.data[0]
        
        return {
            "status": "success",
            "profile": {
                "user_id": profile.get("user_id"),
                "name": profile.get("name"),
                "email": profile.get("email"),
                "resume_url": profile.get("resume_url"),
                "skills": profile.get("skills", []),
                "skills_metadata": profile.get("skills_metadata", {}),
                "experience_summary": profile.get("experience_summary")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
