# Agent 2 - Market Sentinel 

**Agent 2** is the eyes and ears of the system. It continuously scans the job market (mock or real) to find opportunities that match the user's high-level skills.

## Features

- **Job Search** - Scans for "Software Engineer" roles tailored to the user's top skills.
- **Deduplication** - Saves unique jobs to the `jobs` table in Supabase.
- **Vectorization** - Converts job descriptions into embeddings.
- **Pinecone Indexing** - Stores job vectors in **Pinecone** to enable semantic matching by Agent 3.

---

## Workflow

1. **Skill Analysis**: Reads the user's top skills from the state.
2. **Search**: queries job sources (Tavily/Mock) for relevant listings.
3. **Ingestion**:
    - Checks if the job already exists.
    - Saves new jobs to Supabase.
    - Generates embeddings from the job summary/description.
    - Upserts vectors to Pinecone metadata.

## Key Components

- **`tools.py`**: Contains the search logic (integrating with search APIs).
- **`graph.py`**: Managing the pipeline of searching, filtering, and storing results.

## Pinecone Metadata

Each job vector stored in Pinecone includes:
- `job_id`: Database Primary Key
- `title`: Job Title
- `company`: Company Name
- `summary`: Short description for fast matching
