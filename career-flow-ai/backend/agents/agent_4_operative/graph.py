import os
import json
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY must be set in the environment or a .env file")

client = genai.Client(api_key=GEMINI_API_KEY)


def generate_deployment_kit(user_name: str, job_title: str, job_company: str) -> str:
    """
    Generates a personalized "Deployment Kit" PDF with:
    - Cover letter
    - Interview tips
    - Company research summary
    
    Returns the path to the generated PDF.
    """
    print(f"📦 Generating Deployment Kit for {user_name} -> {job_title} at {job_company}")

    prompt = f"""
    You are an expert Career Coach. Generate a personalized job application kit.

    Candidate: {user_name}
    Target Role: {job_title}
    Target Company: {job_company}

    Generate:
    1. A professional cover letter (3 paragraphs)
    2. Top 5 interview questions for this role with suggested answers
    3. Key facts about {job_company} the candidate should know

    Format the output as clean text sections with headers.
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        kit_content = response.text
    except Exception as e:
        print(f"❌ Kit generation failed: {e}")
        kit_content = f"Deployment Kit for {user_name}\n\nTarget: {job_title} at {job_company}\n\n[Content generation failed - please try again]"

    # Save as a simple text file (PDF generation requires additional libs)
    output_dir = os.path.join(os.path.dirname(__file__), "..", "..", "outputs")
    os.makedirs(output_dir, exist_ok=True)
    
    safe_name = user_name.replace(" ", "_").lower()
    output_path = os.path.join(output_dir, f"deployment_kit_{safe_name}.txt")
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(f"DEPLOYMENT KIT\n")
        f.write(f"{'='*50}\n")
        f.write(f"Candidate: {user_name}\n")
        f.write(f"Target Role: {job_title}\n")
        f.write(f"Target Company: {job_company}\n")
        f.write(f"{'='*50}\n\n")
        f.write(kit_content)
    
    print(f"✅ Kit saved to: {output_path}")
    return output_path
