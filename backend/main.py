"""
Career Flow AI - Main Application Entry Point
FastAPI Server for Agentic AI Backend with Multi-Agent Workflow
"""

import os
import uuid
import tempfile
import shutil
import asyncio
import math
import struct
import logging
import time
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

# Load env FIRST before any other imports
load_dotenv()

# Configure logging ONCE here - before any other imports
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Main")

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Body, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

# --- IMPORTS FOR AGENTS & DB ---
from core.state import AgentState
from core.db import db_manager  # Database connection

# Import routers
from agents.agent_4_operative import agent4_router

# Import Agent Nodes/Functions
from agents.agent_1_perception.graph import perception_node, app as perception_agent
from agents.agent_1_perception.github_watchdog import fetch_and_analyze_github  # <--- NEW IMPORT
from agents.agent_2_market.graph import market_scan_node
from agents.agent_3_strategist.graph import search_jobs as strategist_search_jobs, process_career_strategy
from agents.agent_5_interview.graph import (
    chat_interview_graph, 
    voice_interview_graph, 
    create_chat_state, 
    create_voice_state, 
    add_chat_message, 
    add_voice_message,
    run_interview_turn
)
from core.config import AudioState, SILENCE_THRESHOLD, SILENCE_DURATION, COOLDOWN_SECONDS

# Import services
from services.audio_service import transcribe_audio_bytes, synthesize_audio_bytes
from core.context_loader import fetch_interview_context
from langchain_core.messages import HumanMessage
from core.db import db_manager

# Import state
from core.state import AgentState

app = FastAPI(
    title="Career Flow AI API",
    description="AI-powered career automation system with Multi-Agent Workflow",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agent4_router)

# -----------------------------------------------------------------------------
# Global Session Store
# -----------------------------------------------------------------------------
SESSIONS: Dict[str, AgentState] = {}

# -----------------------------------------------------------------------------
# Pydantic Models
# -----------------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    query: Optional[str] = None
    context: Optional[dict] = None

class SearchRequest(BaseModel):
    query: str

class KitRequest(BaseModel):
    user_name: str
    job_title: str
    job_company: str
    session_id: Optional[str] = None  # Add session_id support
    job_description: Optional[str] = None  # Add job description

class SessionRequest(BaseModel):
    session_id: str

class MarketScanRequest(BaseModel):
    session_id: str

class StrategyRequest(BaseModel):
    query: str  # Skills/experience to search for jobs

class ApplicationRequest(BaseModel):
    session_id: str
    job_description: Optional[str] = None

class InterviewRequest(BaseModel):
    session_id: str         # Unique session identifier for conversation state
    user_message: str = ""  # Empty for first turn (start interview)
    job_context: str        # Job title/description

# --- NEW MODEL FOR GITHUB SYNC ---
class GithubSyncRequest(BaseModel):
    session_id: str
    github_url: str

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
def get_session(session_id: str) -> AgentState:
    """Retrieve session state or raise 404."""
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")
    return SESSIONS[session_id]


def initialize_state() -> AgentState:
    """Create a fresh AgentState with default values."""
    return AgentState(
        resume_text=None,
        skills=[],
        user_id=None,
        context={},
        results={}
    )

# -----------------------------------------------------------------------------
# ENDPOINTS
# -----------------------------------------------------------------------------

# --- Pydantic Models ---
class AnalyzeRequest(BaseModel):
    user_input: str
    context: Optional[dict] = {}

class SearchRequest(BaseModel):
    query: str

class KitRequest(BaseModel):
    user_name: str
    job_title: str
    job_company: str


@app.get("/")
async def root():
    return {
        "message": "Career Flow AI API Online",
        "version": "2.0.0",
        "agents_active": 6,
        "endpoints": {
            "workflow": ["/api/init", "/api/upload-resume", "/api/market-scan", "/api/generate-strategy", "/api/generate-application"],
            "interview": "/ws/interview/{job_id}",
            "legacy": ["/api/match", "/api/generate-kit"],
            "agent4": "/agent4",
            "watchdog": "/api/sync-github" # <--- Added to documentation
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "message": "Career Flow AI Backend is running",
            "active_sessions": len(SESSIONS)
        }
    )


@app.post("/analyze")
async def analyze_career(request: AnalyzeRequest):
    """Legacy analyze endpoint"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "message": "Analysis request received",
            "data": {}
        }
    )


@app.post("/api/match")
async def match_agent(request: SearchRequest):
    """Match agent endpoint - uses Agent 3 Strategist."""
    if not request.query:
        raise HTTPException(status_code=400, detail="Query text is required")
    
    try:
        print(f"[Match Agent] Searching for jobs with query: {request.query}")
        
        # First, search for matching jobs
        jobs = strategist_search_jobs(request.query, top_k=10)
        print(f"[Match Agent] Found {len(jobs)} jobs")
        
        if not jobs:
            return {
                "status": "success",
                "count": 0,
                "matches": [],
                "message": "No matching jobs found"
            }
        
        # Then, process career strategy with the found jobs
        print(f"[Match Agent] Processing career strategy...")
        strategy = process_career_strategy(request.query, jobs)
        
        return {
            "status": "success",
            "count": len(jobs),
            "matches": jobs,
            "strategy": strategy
        }
    except Exception as e:
        print(f"[Match Agent] ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Match agent error: {str(e)}")


@app.get("/api/jobs/list")
async def list_available_jobs():
    """List all available jobs in Pinecone for debugging"""
    try:
        from agents.agent_3_strategist.graph import _init_clients, index as pinecone_index
        _init_clients()
        
        # Query to get some jobs
        sample_query = pinecone_index.query(
            vector=[0.1] * 1536,  # Dummy vector
            top_k=20,
            namespace="",
            include_metadata=True
        )
        
        jobs = []
        if sample_query and sample_query.get('matches'):
            for match in sample_query['matches']:
                metadata = match.get('metadata', {})
                jobs.append({
                    "id": match['id'],
                    "title": metadata.get('title', 'Unknown'),
                    "company": metadata.get('company', 'Unknown'),
                    "score": match.get('score', 0)
                })
        
        return JSONResponse(status_code=200, content={
            "total": len(jobs),
            "jobs": jobs
        })
    except Exception as e:
        logger.error(f"[List Jobs] Error: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/generate-kit")
async def generate_kit_endpoint(request: KitRequest):
    """
    Generate deployment kit - tailored resume PDF for a specific job.
    Uses Agent 4 (Operative) to mutate the resume.
    """
    print(f"[Generate Kit] Request for: {request.user_name} - {request.job_title} @ {request.job_company}")
    print(f"[Generate Kit] Request data: {request.model_dump()}")
    
    # Try to get user_id from session
    user_id = None
    user_profile = None
    session_id = getattr(request, 'session_id', None)
    
    print(f"[Generate Kit] Session ID from request: {session_id}")
    
    if session_id and session_id in SESSIONS:
        state = SESSIONS[request.session_id]
        user_id = state.get("user_id")
        perception_results = state.get("results", {}).get("perception", {})
        user_profile = {
            "name": perception_results.get("name") or request.user_name,
            "email": perception_results.get("email", ""),
            "skills": state.get("skills", []),
            "experience_summary": perception_results.get("experience_summary", ""),
            "education": perception_results.get("education", ""),
            "resume": perception_results.get("resume_json", {}),
            "user_id": user_id  # CRITICAL: Include user_id here!
        }
        print(f"[Generate Kit] Found user_id from session: {user_id}")
    
    # If no session, try to find most recent profile from DB
    if not user_id:
        try:
            supabase = db_manager.get_client()
            response = supabase.table("profiles").select("*").order("created_at", desc=True).limit(1).execute()
            
            if response.data:
                profile = response.data[0]
                user_id = profile.get("user_id")  # This is the UUID that matches the PDF in storage!
                user_profile = {
                    "name": profile.get("name") or request.user_name,
                    "email": profile.get("email", ""),
                    "skills": profile.get("skills", []),
                    "experience_summary": profile.get("experience_summary", ""),
                    "education": profile.get("education", ""),
                    "resume": profile.get("resume_json", {}),
                    "user_id": user_id  # CRITICAL: This must match the PDF filename in storage!
                }
                print(f"[Generate Kit] Found user_id from DB: {user_id}")
                print(f"[Generate Kit] Resume URL in DB: {profile.get('resume_url', 'N/A')}")
        except Exception as e:
            print(f"[Generate Kit] DB lookup failed: {e}")
    
    if not user_id:
        return JSONResponse(
            status_code=400,
            content={
                "status": "error",
                "message": "No user profile found. Please upload your resume first.",
                "detail": "Upload your resume on the home page to enable resume generation."
            }
        )
    
    # Build job description from request
    job_description = getattr(request, 'job_description', None) or f"""
    {request.job_title} at {request.job_company}
    
    We are looking for a talented {request.job_title} to join our team at {request.job_company}.
    """
    
    try:
        # Run Agent 4 to generate the tailored resume
        print(f"[Generate Kit] Running Agent 4 for user: {user_id}")
        print(f"[Generate Kit] Will download PDF: {user_id}.pdf from storage")
        
        from agents.agent_4_operative.graph import run_agent4
        
        operative_result = run_agent4(job_description, user_profile)
        
        pdf_url = operative_result.get("pdf_url")
        pdf_path = operative_result.get("pdf_path")
        
        print(f"[Generate Kit] ✅ Resume generated!")
        print(f"   PDF URL: {pdf_url}")
        
        # If we have a PDF URL, return success
        if pdf_url:
            return JSONResponse(
                status_code=200,
                content={
                    "status": "success",
                    "message": "Resume generated successfully",
                    "data": {
                        "pdf_url": pdf_url,
                        "pdf_path": pdf_path,
                        "user_name": request.user_name,
                        "job_title": request.job_title,
                        "job_company": request.job_company,
                        "application_status": operative_result.get("application_status", "ready")
                    }
                }
            )
        else:
            return JSONResponse(
                status_code=500,
                content={
                    "status": "error",
                    "message": "Failed to generate PDF",
                    "detail": str(operative_result.get("error", "Unknown error"))
                }
            )
            
    except Exception as e:
        print(f"[Generate Kit] ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"Failed to generate resume: {str(e)}"
            }
        )

# -----------------------------------------------------------------------------
# NEW AGENT WORKFLOW ENDPOINTS
# -----------------------------------------------------------------------------

@app.post("/api/init")
async def init_session():
    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = initialize_state()
    print(f"[Orchestrator] New session initialized: {session_id}")
    return {"status": "success", "session_id": session_id, "message": "Session initialized."}


@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...), session_id: str = Form(...)):
    """Upload a resume PDF and run Agent 1 (Perception)."""
    state = get_session(session_id)
    
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    try:
        temp_dir = Path(tempfile.gettempdir()) / "career_flow_uploads"
        temp_dir.mkdir(exist_ok=True)
        pdf_filename = f"{session_id}_{file.filename}"
        pdf_path = temp_dir / pdf_filename
        
        with open(pdf_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        print(f"[Orchestrator] Resume saved: {pdf_path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    state["context"]["pdf_path"] = str(pdf_path)
    
    try:
        print(f"[Orchestrator] Running Agent 1 (Perception) for session: {session_id}")
        updated_state = perception_node(state)
        SESSIONS[session_id].update(updated_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Perception Agent failed: {str(e)}")
    
    perception_results = SESSIONS[session_id].get("results", {}).get("perception", {})
    return {
        "status": "success",
        "session_id": session_id,
        "profile": {
            "name": perception_results.get("name"),
            "email": perception_results.get("email"),
            "skills": SESSIONS[session_id].get("skills", []),
            "experience_summary": perception_results.get("experience_summary"),
            "education": perception_results.get("education"),
            "user_id": SESSIONS[session_id].get("user_id")
        }
    }

@app.post("/api/sync-github")
async def sync_github(request: GithubSyncRequest):
    """
    1. Analyzes the GitHub Repo using Agent 1's Watchdog.
    2. Updates the User Profile in Supabase/Session.
    3. CRITICAL: Puts NEW skills at the FRONT of the list so Agent 3 prioritizes them.
    """
    print(f"🚀 Syncing GitHub for session: {request.session_id}")
    
    # 1. Run the Watchdog
    analysis = fetch_and_analyze_github(request.github_url)
    
    if not analysis:
        print("⚠️ GitHub analysis failed or returned empty.")
        return {"status": "failed", "message": "Could not analyze repo", "analysis": {}}

    new_skills = [item['skill'] for item in analysis.get('detected_skills', [])]
    print(f"✅ Watchdog found new skills: {new_skills}")

    # 2. Smart Merge: New Skills First!
    # We want the search query to look like: "Pandas, Scikit-Learn, Python, ... Spring, Java"
    # This forces the AI to see the Data Science context first.
    
    current_skills = []
    if request.session_id in SESSIONS:
        current_skills = SESSIONS[request.session_id].get("skills", [])
    
    # Filter out duplicates from OLD list, keep NEW list order intact
    old_unique_skills = [s for s in current_skills if s not in new_skills]
    
    # COMBINE: NEW + OLD
    final_skills = new_skills + old_unique_skills
    
    # Update Session
    if request.session_id in SESSIONS:
        SESSIONS[request.session_id]["skills"] = final_skills
        print(f"🔄 Session skills updated: {len(current_skills)} -> {len(final_skills)} (New skills prioritized)")

    # 3. Update Database (Persistent Storage)
    client = db_manager.get_client()
    try:
        print("🔍 DB: finding most recent profile to update...")
        response = client.table("profiles").select("*").order("created_at", desc=True).limit(1).execute()

        if response.data:
            profile = response.data[0]
            profile_id = profile['id']
            
            # DB Merge (Repeat logic to be safe)
            db_existing_skills = profile.get('skills', []) or []
            db_old_unique = [s for s in db_existing_skills if s not in new_skills]
            db_final_skills = new_skills + db_old_unique
            
            # Update the DB
            client.table("profiles").update({
                "skills": db_final_skills
            }).eq("id", profile_id).execute()
            
            print(f"💾 Updated Profile {profile_id} in DB with {len(db_final_skills)} total skills.")
            
            return {
                "status": "success", 
                "analysis": analysis,
                "updated_skills": db_final_skills # Returning ordered list
            }
        else:
             print("⚠️ No profile found in DB.")

    except Exception as e:
        print(f"❌ DB Update Error (Non-fatal): {e}")
        # Return success with the session-based skills
        return {"status": "partial_success", "analysis": analysis, "updated_skills": final_skills}

    return {"status": "success", "analysis": analysis, "updated_skills": final_skills}

# Add this model near the top with others
class WatchdogCheckRequest(BaseModel):
    session_id: str
    last_known_sha: Optional[str] = None # To avoid re-analyzing the same commit


# In backend/main.py

@app.post("/api/watchdog/check")
async def watchdog_check(request: WatchdogCheckRequest):
    """
    Polls GitHub. Uses SERVER MEMORY to strictly prevent re-scanning the same commit.
    """
    from agents.agent_1_perception.github_watchdog import get_latest_user_activity, fetch_and_analyze_github
    
    # 1. Check GitHub for latest activity
    activity = get_latest_user_activity("dummy") 
    
    if not activity:
        return {"status": "error", "message": "Could not fetch GitHub activity"}
        
    current_sha = activity['latest_commit_sha']
    repo_name = activity['repo_name']
    
    # --- BULLETPROOF FIX: Check Server Memory ---
    # We check if we already processed this SHA for this session in RAM.
    last_processed_sha = None
    if request.session_id in SESSIONS:
        last_processed_sha = SESSIONS[request.session_id].get("last_watchdog_sha")

    # If Frontend knows it OR Backend remembers it -> STOP.
    if request.last_known_sha == current_sha or last_processed_sha == current_sha:
        return {"status": "no_change", "repo_name": repo_name}
        
    # 3. If we are here, it is genuinely NEW.
    print(f"🔔 LIVE WATCHDOG: New activity detected in {repo_name} (SHA: {current_sha[:7]})")
    
    # MEMORIZE IT NOW (Before analysis, to prevent race conditions)
    if request.session_id in SESSIONS:
        SESSIONS[request.session_id]["last_watchdog_sha"] = current_sha
    
    # 4. Run Analysis
    analysis = fetch_and_analyze_github(activity['repo_url'])
    
    if not analysis:
        # Return updated status so frontend syncs up
        return {
            "status": "updated", 
            "repo_name": repo_name, 
            "new_sha": current_sha,
            "updated_skills": [],
            "analysis": {}
        }

    new_skills = [item['skill'] for item in analysis.get('detected_skills', [])]
    
    # 5. Update Database
    client = db_manager.get_client()
    final_skills = new_skills
    
    try:
        if request.session_id in SESSIONS:
            existing = SESSIONS[request.session_id].get("skills", [])
            unique_old = [s for s in existing if s not in new_skills]
            final_skills = new_skills + unique_old 
            SESSIONS[request.session_id]["skills"] = final_skills
            
        response = client.table("profiles").select("*").order("created_at", desc=True).limit(1).execute()
        if response.data:
            profile_id = response.data[0]['id']
            client.table("profiles").update({"skills": final_skills}).eq("id", profile_id).execute()
            
    except Exception as e:
        print(f"❌ DB Error: {e}")

    return {
        "status": "updated",
        "repo_name": repo_name,
        "new_sha": current_sha,
        "updated_skills": final_skills,
        "analysis": analysis
    }

@app.post("/api/market-scan")
async def market_scan(request: MarketScanRequest):
    """Run Agent 2 (Market Sentinel) to find job matches."""
    session_id = request.session_id
    state = get_session(session_id)
    try:
        print(f"[Orchestrator] Running Agent 2 (Market) for session: {session_id}")
        updated_state = market_scan_node(state)
        SESSIONS[session_id].update(updated_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Market Agent failed: {str(e)}")
    market_results = SESSIONS[session_id].get("results", {}).get("market", {})
    job_matches = market_results.get("job_matches", [])
    return {"status": "success", "session_id": session_id, "job_matches": job_matches, "total_matches": len(job_matches)}


@app.post("/api/generate-strategy")
async def generate_strategy(request: StrategyRequest):
    """Run Agent 3 (Strategist) for semantic job matching with roadmaps."""
    query_text = request.query.strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Query is required for job matching.")
    try:
        print(f"[Orchestrator] Running Agent 3 (Strategist) with query: {query_text[:100]}...")
        result = process_career_strategy(query_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Strategist Agent failed: {str(e)}")
    
    return {
        "status": "success",
        "strategy": {
            "matched_jobs": result.get("strategy_report", []),
            "total_matches": result.get("matches_found", 0),
            "query_used": query_text[:200],
            "tier_summary": {
                "A_ready": len([j for j in result.get("strategy_report", []) if j.get("tier") == "A"]),
                "B_roadmap": len([j for j in result.get("strategy_report", []) if j.get("tier") == "B"]),
                "C_low": len([j for j in result.get("strategy_report", []) if j.get("tier") == "C"])
            }
        }
    }


@app.post("/api/generate-application")
async def generate_application(request: ApplicationRequest):
    """Run Agent 4 (Operative) to generate tailored resume and outreach."""
    session_id = request.session_id
    state = get_session(session_id)
    job_description = request.job_description
    if not job_description:
        strategist_results = state.get("results", {}).get("strategist", {})
        matched_jobs = strategist_results.get("matched_jobs", [])
        if matched_jobs: job_description = matched_jobs[0].get("description", "")
    if not job_description:
        market_results = state.get("results", {}).get("market", {})
        job_matches = market_results.get("job_matches", [])
        if job_matches: job_description = job_matches[0].get("description", job_matches[0].get("summary", ""))
    if not job_description:
        raise HTTPException(status_code=400, detail="job_description is required")
    
    perception_results = state.get("results", {}).get("perception", {})
    user_profile = {
        "name": perception_results.get("name"),
        "email": perception_results.get("email"),
        "skills": state.get("skills", []),
        "experience_summary": perception_results.get("experience_summary"),
        "education": perception_results.get("education"),
        "resume": perception_results.get("resume_json", {})
    }
    
    try:
        print(f"[Orchestrator] Running Agent 4 (Operative) for session: {session_id}")
        from agents.agent_4_operative.graph import run_agent4
        operative_result = run_agent4(job_description, user_profile)
        if "results" not in SESSIONS[session_id]: SESSIONS[session_id]["results"] = {}
        SESSIONS[session_id]["results"]["operative"] = operative_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Operative Agent failed: {str(e)}")
    
    return {
        "status": "success",
        "session_id": session_id,
        "application": {
            "pdf_path": operative_result.get("pdf_path"),
            "pdf_url": operative_result.get("pdf_url"),
            "recruiter_email": operative_result.get("recruiter_email"),
            "application_status": operative_result.get("application_status"),            "rewritten_content": operative_result.get("rewritten_content")
        }
    }


@app.post("/api/interview/chat")
async def interview_chat(request: InterviewRequest):
    """Agent 6: Interview Chat Endpoint"""
    if not request.session_id: raise HTTPException(status_code=400, detail="session_id is required")
    if not request.job_context: raise HTTPException(status_code=400, detail="job_context is required")
    try:
        result = run_interview_turn(session_id=request.session_id, user_message=request.user_message, job_context=request.job_context)
        return {"status": "success", "response": result["response"], "stage": result["stage"], "message_count": result["message_count"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interview chat failed: {str(e)}")
    
@app.get("/api/interviews/{user_id}")
async def get_interview_history(user_id: str):
    """
    Fetch interview history for a user directly from the database.
    Bypasses RLS by using the backend service role key.
    """
    try:
        response = db_manager.get_client().table("interviews") \
            .select("id, created_at, feedback_report") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
        
        # Parse the feedback_report JSON string into an object
        results = []
        for item in response.data:
            parsed_item = {
                "id": item["id"],
                "created_at": item["created_at"],
                "feedback_report": item["feedback_report"]
            }
            # If feedback_report is a string, parse it
            if isinstance(item.get("feedback_report"), str):
                try:
                    parsed_item["feedback_report"] = json.loads(item["feedback_report"])
                except json.JSONDecodeError:
                    parsed_item["feedback_report"] = {"score": 0, "verdict": "Error", "summary": "Failed to parse feedback"}
            results.append(parsed_item)
            
        return results
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------------------------------------------------------
# INTERVIEW HISTORY API
# -----------------------------------------------------------------------------

@app.get("/api/interviews/{user_id}")
async def get_interview_history(user_id: str):
    """Fetch past interviews for a user from Supabase."""
    try:
        response = db_manager.get_client().table("interviews").select(
            "id, created_at, feedback_report, interview_type, job_id"
        ).eq("user_id", user_id).order("created_at", desc=True).limit(20).execute()
        
        interviews = response.data if response.data else []
        logger.info(f"[API] Fetched {len(interviews)} interviews for user {user_id[:8]}...")
        return interviews
    except Exception as e:
        logger.error(f"Error fetching interviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------------------------------------------------------
# VAD Settings for Voice Interview (Imported from core.config)
# -----------------------------------------------------------------------------

def calculate_rms(audio_chunk: bytes) -> float:
    """Calculates the Root Mean Square (volume) of the audio chunk."""
    if not audio_chunk: return 0
    count = len(audio_chunk) // 2
    if count == 0: return 0
    try:
        shorts = struct.unpack(f"{count}h", audio_chunk)
        sum_squares = sum(s ** 2 for s in shorts)
        return math.sqrt(sum_squares / count)
    except:
        return 0

# -----------------------------------------------------------------------------
# AGENT 5: TEXT-BASED WEBSOCKET INTERVIEW (LangGraph)
# -----------------------------------------------------------------------------

@app.websocket("/ws/interview/text/{job_id}")
async def interview_text_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    
    # Wait for initial auth message from frontend
    try:
        init_data = await asyncio.wait_for(websocket.receive_json(), timeout=10.0)
        interview_type = init_data.get("interview_type", "TECHNICAL").upper()
        
        # HARDCODED user_id for testing
        user_id = "d5040da0-aca7-4ba7-a96b-80e4c9ee1c44"
        logger.info(f"[Text Interview] Using hardcoded user: {user_id[:8]}...")
            
    except asyncio.TimeoutError:
        await websocket.send_json({"type": "error", "message": "Auth timeout"})
        await websocket.close()
        return
    
    # Clean job_id
    import re
    numeric_part = re.search(r'\d+', job_id)
    job_id_clean = numeric_part.group() if numeric_part else job_id
    
    try:
        full_context = fetch_interview_context(user_id, job_id_clean)
        full_context["user_id"] = user_id
        full_context["job_id"] = job_id_clean
        logger.info(f"[Text {interview_type}] Context: {full_context['job']['title']} | {full_context['user']['name']}")
    except Exception as e:
        logger.error(f"Context Error: {e}")
        await websocket.send_json({"type": "error", "message": str(e)})
        await websocket.close()
        return

    thread_id = f"text_{user_id}_{job_id}_{uuid.uuid4()}"
    config = {"configurable": {"thread_id": thread_id}}
    state = create_chat_state(full_context, interview_type=interview_type, user_id=user_id, job_id=job_id_clean)
    
    # Send interview config to frontend
    await websocket.send_json({
        "type": "config",
        "interview_type": interview_type,
        "job_title": full_context['job'].get('title', 'Unknown'),
        "user_name": full_context['user'].get('name', 'Candidate')
    })
    
    await websocket.send_json({"type": "event", "event": "thinking", "status": "start"})
    result = chat_interview_graph.invoke(state, config=config)
    ai_message = result["messages"][-1].content if result["messages"] else "Hello!"
    
    await websocket.send_json({"type": "event", "event": "thinking", "status": "end"})
    await websocket.send_json({"type": "event", "event": "stage_change", "stage": result.get("stage", "intro")})
    await websocket.send_json({"type": "message", "role": "assistant", "content": ai_message})
    
    try:
        while True:
            data = await websocket.receive_json()
            user_text = data.get("message", "")
            if not user_text.strip():
                continue
            
            logger.info(f"[Text {interview_type}] User: {user_text[:50]}...")
            await websocket.send_json({"type": "event", "event": "thinking", "status": "start"})
            
            state = add_chat_message(result, user_text)
            result = chat_interview_graph.invoke(state, config=config)
            
            ai_message = result["messages"][-1].content if result["messages"] else "Could you repeat?"
            current_stage = result.get("stage", "unknown")
            
            logger.info(f"[Text {interview_type}] Stage: {current_stage} | Turn: {result.get('turn', 0)}")
            
            await websocket.send_json({"type": "event", "event": "thinking", "status": "end"})
            await websocket.send_json({"type": "event", "event": "stage_change", "stage": current_stage})
            await websocket.send_json({"type": "message", "role": "assistant", "content": ai_message})
            
            # Check if interview is ending
            if current_stage == "end" or result.get("ending"):
                logger.info(f"[Text {interview_type}] Interview ending - triggering evaluation...")
                
                # Re-invoke graph to trigger evaluate_node (graph is interrupted after interviewer)
                try:
                    logger.info(f"[Text] Running evaluation with user_id: {user_id[:8]}..., job_id: {job_id_clean}")
                    final_result = chat_interview_graph.invoke(result, config=config)
                    feedback = final_result.get("feedback")
                    
                    if feedback:
                        logger.info(f"✅ Feedback saved: {feedback.get('verdict', 'N/A')} - Score: {feedback.get('score', 0)}")
                        
                        verdict = feedback.get("verdict", "Thank you")
                        score = feedback.get("score", 0)
                        summary = feedback.get("summary", "We appreciate your time.")
                        
                        feedback_message = f"\n\n**Interview Results**\n\n{verdict}. Your interview score is {score} out of 100.\n\n{summary}"
                        
                        await websocket.send_json({"type": "feedback", "data": feedback})
                        await websocket.send_json({"type": "message", "role": "assistant", "content": feedback_message})
                    else:
                        logger.warning("[Text] No feedback returned from evaluation")
                except Exception as eval_error:
                    logger.error(f"[Text] Evaluation error: {eval_error}")
                    import traceback
                    traceback.print_exc()
                
                await asyncio.sleep(1)
                logger.info("Closing interview session")
                await websocket.close()
                break
                
    except WebSocketDisconnect:
        logger.info("[Text Interview] Client Disconnected")

# -----------------------------------------------------------------------------
# AGENT 5: WEBSOCKET VOICE INTERVIEW ENDPOINT (LangGraph)
# -----------------------------------------------------------------------------

@app.websocket("/ws/interview/{job_id}")
async def interview_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    
    # Audio state machine to prevent listening while AI speaks
    audio_state = AudioState.IDLE
    
    # Wait for initial auth message from frontend
    try:
        init_data = await asyncio.wait_for(websocket.receive_json(), timeout=10.0)
        interview_type = init_data.get("interview_type", "TECHNICAL").upper()
        
        # HARDCODED user_id for testing
        user_id = "d5040da0-aca7-4ba7-a96b-80e4c9ee1c44"
        logger.info(f"[Voice Interview] Using hardcoded user: {user_id[:8]}...")
            
    except asyncio.TimeoutError:
        await websocket.send_json({"type": "error", "message": "Auth timeout"})
        await websocket.close()
        return
    
    # Clean job_id: "73.0" -> "73" or "job_18" -> "18"
    import re
    numeric_part = re.search(r'\d+', job_id)
    if not numeric_part:
        await websocket.send_json({"type": "error", "message": "Invalid job ID"})
        await websocket.close()
        return
    job_id_clean = numeric_part.group()
    
    logger.info(f"[Voice {interview_type}] Starting - Job: {job_id_clean}, User: {user_id[:8]}...")
    
    try:
        full_context = fetch_interview_context(user_id, job_id_clean)
        full_context["user_id"] = user_id
        full_context["job_id"] = job_id_clean
        logger.info(f"[Voice {interview_type}] Context: {full_context['job']['title']} | {full_context['user']['name']}")
    except Exception as e:
        logger.error(f"Context Error: {e}")
        await websocket.send_json({"type": "error", "message": f"Failed to load interview context: {str(e)}"})
        await websocket.close()
        return

    thread_id = f"voice_{user_id}_{job_id}_{uuid.uuid4()}"
    config = {"configurable": {"thread_id": thread_id}}
    state = create_voice_state(full_context, interview_type=interview_type, user_id=user_id, job_id=job_id_clean)
    
    # Send interview config to frontend
    await websocket.send_json({
        "type": "config",
        "interview_type": interview_type,
        "job_title": full_context['job'].get('title', 'Unknown'),
        "user_name": full_context['user'].get('name', 'Candidate')
    })
    
    # State: THINKING - AI generating welcome message
    audio_state = AudioState.THINKING
    await websocket.send_json({"type": "event", "event": "audio_state", "state": "thinking"})
    logger.info("[Voice] State -> THINKING")
    
    welcome_start = time.time()
    result = voice_interview_graph.invoke(state, config=config)
    welcome_text = result["messages"][-1].content if result["messages"] else "Hello!"
    
    # State: SPEAKING - AI speaking welcome
    audio_state = AudioState.SPEAKING
    await websocket.send_json({"type": "event", "event": "audio_state", "state": "speaking"})
    logger.info("[Voice] State -> SPEAKING")
    
    tts_start = time.time()
    clean_welcome = welcome_text.replace('**', '').replace('*', '').replace('_', '').replace('~~', '')
    welcome_audio = synthesize_audio_bytes(clean_welcome)
    tts_time = time.time() - tts_start
    logger.info(f"⏱️ Welcome TTS: {tts_time:.2f}s, Total: {time.time() - welcome_start:.2f}s")
    
    await websocket.send_json({"type": "event", "event": "stage_change", "stage": result.get("stage", "intro")})
    await websocket.send_bytes(welcome_audio)
    
    # Calculate audio duration (16kHz, 16-bit = 32000 bytes/sec)
    audio_duration = len(welcome_audio) / 32000.0
    wait_time = max(audio_duration + 0.5, COOLDOWN_SECONDS)  # Add buffer
    logger.info(f"[Voice] Audio duration: {audio_duration:.2f}s, waiting {wait_time:.2f}s before listening")
    await asyncio.sleep(wait_time)
    
    # State: LISTENING - Ready for user input
    audio_state = AudioState.LISTENING
    await websocket.send_json({"type": "event", "event": "audio_state", "state": "listening"})
    logger.info("[Voice] State -> LISTENING")
    
    audio_buffer = bytearray()
    silence_start_time = None
    is_speaking = False
    last_ai_response_time = time.time()
    
    try:
        while result.get("stage") != "end" and not result.get("ending"):
            data = await websocket.receive_bytes()
            
            # CRITICAL: Only process audio when in LISTENING state
            if audio_state != AudioState.LISTENING:
                continue
            
            # Ignore buffered audio during cooldown
            if time.time() - last_ai_response_time < COOLDOWN_SECONDS:
                continue
            
            audio_buffer.extend(data)
            rms = calculate_rms(data)
            
            if rms > SILENCE_THRESHOLD:
                is_speaking = True
                silence_start_time = None
            elif is_speaking:
                if silence_start_time is None:
                    silence_start_time = asyncio.get_event_loop().time()
                
                if (asyncio.get_event_loop().time() - silence_start_time) >= SILENCE_DURATION:
                    logger.info(f"[Voice {interview_type}] Processing user audio...")
                    
                    # State: THINKING
                    audio_state = AudioState.THINKING
                    await websocket.send_json({"type": "event", "event": "audio_state", "state": "thinking"})
                    logger.info("[Voice] State -> THINKING")
                    
                    turn_start = time.time()
                    
                    # Transcription
                    transcribe_start = time.time()
                    user_text = transcribe_audio_bytes(bytes(audio_buffer))
                    transcribe_time = time.time() - transcribe_start
                    
                    # Clear buffer
                    audio_buffer = bytearray()
                    is_speaking = False
                    silence_start_time = None
                    
                    if user_text.strip():
                        logger.info(f"[Voice {interview_type}] User: {user_text[:50]}...")
                        logger.info(f"⏱️ Transcription: {transcribe_time:.2f}s")
                        
                        # LLM Inference
                        llm_start = time.time()
                        state = add_voice_message(result, user_text)
                        result = voice_interview_graph.invoke(state, config=config)
                        llm_time = time.time() - llm_start
                        
                        ai_text = result["messages"][-1].content if result["messages"] else "Could you repeat?"
                        current_stage = result.get("stage", "unknown")
                        
                        logger.info(f"[Voice {interview_type}] Stage: {current_stage} | Turn: {result.get('turn', 0)}")
                        logger.info(f"⏱️ Graph+LLM: {llm_time:.2f}s")
                        
                        # State: SPEAKING
                        audio_state = AudioState.SPEAKING
                        await websocket.send_json({"type": "event", "event": "audio_state", "state": "speaking"})
                        logger.info("[Voice] State -> SPEAKING")
                        await websocket.send_json({"type": "event", "event": "stage_change", "stage": current_stage})
                        
                        # Audio Synthesis
                        tts_start = time.time()
                        clean_text = ai_text.replace('**', '').replace('*', '').replace('_', '').replace('~~', '')
                        audio_bytes = synthesize_audio_bytes(clean_text)
                        tts_time = time.time() - tts_start
                        logger.info(f"⏱️ Audio TTS: {tts_time:.2f}s")
                        
                        await websocket.send_bytes(audio_bytes)
                        
                        total_time = time.time() - turn_start
                        logger.info(f"⏱️ TOTAL TURN: {total_time:.2f}s")
                        
                        # Wait for audio to finish before listening again
                        audio_duration = len(audio_bytes) / 32000.0  # 16kHz, 16-bit
                        wait_time = max(audio_duration + 0.5, COOLDOWN_SECONDS)
                        logger.info(f"[Voice] Audio duration: {audio_duration:.2f}s, waiting {wait_time:.2f}s")
                        await asyncio.sleep(wait_time)
                        
                        last_ai_response_time = time.time()
                        
                        # Check if interview is ending
                        if current_stage == "end" or result.get("ending"):
                            logger.info(f"[Voice {interview_type}] Interview ending...")
                            
                            # Send goodbye audio
                            goodbye_msg = "Thank you for your time today. We'll review and be in touch soon."
                            await websocket.send_bytes(synthesize_audio_bytes(goodbye_msg))
                            await asyncio.sleep(3)
                            
                            # Run evaluation - pass the current result state so evaluate_node has access to context
                            try:
                                logger.info(f"[Voice] Running evaluation with user_id: {user_id[:8]}..., job_id: {job_id_clean}")
                                
                                # The graph is paused after interviewer node, resume it to trigger evaluate
                                final_result = await asyncio.to_thread(
                                    voice_interview_graph.invoke,
                                    result,  # Pass current state, not None
                                    {"configurable": {"thread_id": thread_id}}
                                )
                                feedback = final_result.get("feedback")
                                
                                if feedback:
                                    logger.info(f"✅ Feedback saved: {feedback.get('verdict')} - Score: {feedback.get('score')}")
                                    await websocket.send_json({"type": "feedback", "data": feedback})
                                    
                                    verdict = feedback.get("verdict", "Thank you")
                                    score = feedback.get("score", 0)
                                    feedback_msg = f"{verdict}. Score: {score}. We'll be in touch soon."
                                    await websocket.send_bytes(synthesize_audio_bytes(feedback_msg))
                                    await asyncio.sleep(3)
                                else:
                                    logger.warning("[Voice] No feedback returned from evaluation")
                            except Exception as eval_error:
                                logger.error(f"Evaluation error: {eval_error}")
                                import traceback
                                traceback.print_exc()
                            
                            await websocket.close()
                            break
                        
                        # State: LISTENING - Ready for next input
                        audio_state = AudioState.LISTENING
                        await websocket.send_json({"type": "event", "event": "audio_state", "state": "listening"})
                        logger.info("[Voice] State -> LISTENING")
                    else:
                        # No valid transcription - go back to listening
                        logger.info("[Voice] Empty transcription, back to listening")
                        audio_state = AudioState.LISTENING
                        await websocket.send_json({"type": "event", "event": "audio_state", "state": "listening"})
                        last_ai_response_time = time.time()

    except WebSocketDisconnect:
        logger.info(f"[Voice {interview_type}] Client Disconnected")

# -----------------------------------------------------------------------------
# Entry Point
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")