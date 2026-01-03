"""
Agent 1 Perception - Helper Tools (LangChain Edition)
1. Parse PDF
2. Extract Data (LangChain Chain)
3. Generate Embeddings (LangChain Embeddings)
4. Upload PDF to Supabase Storage
"""

import os
import json
from typing import Any
from pypdf import PdfReader
from supabase import create_client

# --- LANGCHAIN IMPORTS ---
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser

def parse_pdf(file_path: str) -> str:
    """Parse a PDF file and extract all text."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found: {file_path}")
    
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise Exception(f"Error parsing PDF: {str(e)}")

def extract_structured_data(text: str) -> dict[str, Any]:
    """
    Extract structured data using a LangChain extraction chain.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY must be set in .env")
    
    # 1. Initialize the LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        temperature=0, 
        google_api_key=api_key
    )
    
    # 2. Define the Output Parser
    parser = JsonOutputParser()
    
    # 3. Define the Prompt Template
    prompt = PromptTemplate(
        template="""
        You are an expert Resume Parser. 
        Please analyze the following resume text and extract the information into the specified JSON format.
        
        {format_instructions}
        
        RESUME TEXT:
        {text}
        """,
        input_variables=["text"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )
    
    # 4. Create the Chain
    chain = prompt | llm | parser
    
    try:
        print("[LangChain] Extracting structured profile data...")
        data = chain.invoke({"text": text})
        
        # Data Sanitization
        if not isinstance(data.get("skills"), list):
            data["skills"] = [str(data.get("skills", ""))] if data.get("skills") else []
            
        return data

    except Exception as e:
        print(f"[LangChain] Extraction Error: {e}")
        # Fallback to prevent crash
        return {
            "name": None,
            "email": None, 
            "skills": [], 
            "experience_summary": "Extraction failed", 
            "education": []
        }

def generate_embedding(text: str) -> list[float]:
    """
    Generate embeddings using LangChain's wrapper.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY must be set in .env")

    try:
        embeddings_model = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001", 
            google_api_key=api_key
        )
        return embeddings_model.embed_query(text)
    except Exception as e:
        raise Exception(f"Error generating embedding: {str(e)}")

def upload_resume_to_storage(pdf_path: str, user_id: str) -> str:
    """
    Uploads the PDF to Supabase 'Resume' bucket and returns a Signed URL.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    # CRITICAL: Use Service Role Key to bypass RLS for uploads
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not service_key:
        print("⚠️ Warning: SUPABASE_SERVICE_ROLE_KEY not found. Upload might fail due to permissions.")
        service_key = os.getenv("SUPABASE_KEY") # Fallback
    
    # Initialize client
    supabase = create_client(supabase_url, service_key)
    
    bucket_name = "Resume"
    file_name = f"{user_id}.pdf"
    
    print(f"[Perception] Uploading original PDF to Storage (Bucket: {bucket_name})...")
    
    try:
        with open(pdf_path, "rb") as f:
            file_data = f.read()
            
        # Upload (overwrite if exists)
        supabase.storage.from_(bucket_name).upload(
            path=file_name,
            file=file_data,
            file_options={"content-type": "application/pdf", "upsert": "true"}
        )
        
        # Generate Signed URL (1 year validity)
        signed_url_response = supabase.storage.from_(bucket_name).create_signed_url(
            path=file_name,
            expires_in=31536000 
        )
        
        # Handle SDK version differences
        if isinstance(signed_url_response, dict):
             signed_url = signed_url_response.get("signedURL")
        else:
             signed_url = signed_url_response 
             
        print(f"[Perception] PDF Uploaded! URL generated.")
        return signed_url

    except Exception as e:
        print(f"[Perception] ❌ Error uploading PDF: {str(e)}")
        return None