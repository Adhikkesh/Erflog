# Erflog Backend API Requirements

## Overview

This document outlines the API endpoints and data structures required by the frontend for each page.

---

## 📄 PAGE 1: Home Page (The Nexus)

**Route:** `/`

### Endpoint: `POST /api/resume/upload`

**Description:** Upload resume file for processing

#### Request

```typescript
// Content-Type: multipart/form-data
{
  file: File; // PDF or DOCX file
}
```

#### Response

```typescript
{
  "status": "success",
  "message": "Resume processed successfully",
  "user_id": "uuid-string",
  "profile": {
    "name": "John Doe",
    "email": "john@example.com",
    "skills": ["Python", "React", "TypeScript", "FastAPI"],
    "experience_years": 3,
    "education": [
      {
        "degree": "B.Tech Computer Science",
        "institution": "XYZ University",
        "year": 2022
      }
    ],
    "work_history": [
      {
        "title": "Software Developer",
        "company": "ABC Corp",
        "duration": "2022-2024",
        "description": "Built web applications..."
      }
    ]
  }
}
```

---

## 📄 PAGE 2: Dashboard (Strategy Board)

**Route:** `/dashboard`

### Endpoint: `GET /api/jobs/matches`

**Description:** Get matched jobs for the user based on their resume

#### Request

```typescript
// Headers
{
  "Authorization": "Bearer <token>"  // or user_id in query params
}

// Query Params (optional)
{
  "limit": 30,        // number of matches to return
  "min_score": 0.3    // minimum match score threshold
}
```

#### Response

```typescript
{
  "status": "success",
  "count": 5,
  "matches": [
    {
      "id": "1",
      "score": 0.554959476,        // Match score (0-1)
      "title": "Full Stack Developer (Python + TypeScript)",
      "company": "Michael Page",
      "description": "Develop and maintain web applications...",
      "link": "https://linkedin.com/jobs/..." | "null",
      "location": "Remote",
      "salary": "$120k - $150k",     // Optional
      "status": "Learning Path Required" | "Ready to Apply",
      "action": "Start Roadmap" | "Apply Now",
      "skills_required": ["Python", "TypeScript", "React"],
      "skills_matched": ["Python", "React"],
      "gap_skills": ["TypeScript", "FastAPI"]
    }
  ]
}
```

---

## 📄 PAGE 3: Jobs List

**Route:** `/jobs`

### Endpoint: `GET /api/jobs/matches` (Same as Dashboard)

**Description:** Get all matched jobs with full roadmap details

#### Response

```typescript
{
  "status": "success",
  "count": 5,
  "matches": [
    {
      "id": "1",
      "score": 0.554959476,
      "title": "Full Stack Developer (Python + TypeScript)",
      "company": "Michael Page",
      "description": "Develop and maintain web applications using Python and TypeScript. Collaborate with cross-functional teams, ensure code quality, debug technical issues, and contribute to scalable system architectures.",
      "link": "null" | "https://...",
      "status": "Learning Path Required",
      "action": "Start Roadmap",
      "roadmap_details": {
        "missing_skills": [
          "Python Web Framework (FastAPI/Flask)",
          "TypeScript",
          "Scalable System Architecture Principles"
        ],
        "roadmap": [
          {
            "day": 1,
            "topic": "FastAPI Fundamentals",
            "tasks": [
              "Set up a Python development environment with FastAPI installed.",
              "Create a simple \"Hello, World\" API endpoint using FastAPI.",
              "Learn how to define request and response models using Pydantic.",
              "Implement basic routing and handle different HTTP methods (GET, POST).",
              "Explore FastAPI's automatic data validation capabilities."
            ],
            "resources": [
              {
                "name": "Official FastAPI Documentation",
                "url": "https://fastapi.tiangolo.com/"
              },
              {
                "name": "YouTube Tutorial",
                "url": "https://www.youtube.com/results?search_query=fastapi+tutorial+for+beginners"
              }
            ]
          },
          {
            "day": 2,
            "topic": "FastAPI Advanced Concepts and TypeScript Basics",
            "tasks": [
              "Implement FastAPI Dependency Injection...",
              "Learn about FastAPI's security features...",
              "Set up a TypeScript development environment.",
              "Learn the basic syntax of TypeScript..."
            ],
            "resources": [
              {
                "name": "FastAPI Dependency Injection",
                "url": "https://fastapi.tiangolo.com/tutorial/dependencies/"
              },
              {
                "name": "Official TypeScript Documentation",
                "url": "https://www.typescriptlang.org/docs/"
              }
            ]
          },
          {
            "day": 3,
            "topic": "Connecting FastAPI and TypeScript & Scalability Principles",
            "tasks": [
              "Explore OpenAPI/Swagger...",
              "Learn how to make API calls from TypeScript...",
              "Research basic scalability patterns..."
            ],
            "resources": [
              {
                "name": "OpenAPI/Swagger Documentation",
                "url": "https://swagger.io/docs/"
              }
            ]
          }
        ]
      }
    }
  ]
}
```

---

## 📄 PAGE 4: Job Detail

**Route:** `/jobs/[id]`

### Endpoint: `GET /api/jobs/:id`

**Description:** Get single job details with full roadmap

#### Request

```typescript
// URL Params
{
  "id": "1"  // Job ID
}
```

#### Response

```typescript
{
  "status": "success",
  "job": {
    "id": "1",
    "score": 0.554959476,
    "title": "Full Stack Developer (Python + TypeScript)",
    "company": "Michael Page",
    "description": "Develop and maintain web applications using Python and TypeScript...",
    "link": "null" | "https://linkedin.com/jobs/view/123",
    "status": "Learning Path Required",
    "action": "Start Roadmap",
    "roadmap_details": {
      "missing_skills": [
        "Python Web Framework (FastAPI/Flask)",
        "TypeScript",
        "Scalable System Architecture Principles"
      ],
      "roadmap": [
        {
          "day": 1,
          "topic": "FastAPI Fundamentals",
          "tasks": [
            "Set up a Python development environment with FastAPI installed.",
            "Create a simple \"Hello, World\" API endpoint using FastAPI.",
            "Learn how to define request and response models using Pydantic.",
            "Implement basic routing and handle different HTTP methods (GET, POST).",
            "Explore FastAPI's automatic data validation capabilities."
          ],
          "resources": [
            {
              "name": "Official FastAPI Documentation",
              "url": "https://fastapi.tiangolo.com/"
            },
            {
              "name": "YouTube Tutorial",
              "url": "https://www.youtube.com/results?search_query=fastapi+tutorial+for+beginners"
            }
          ]
        }
        // ... more days
      ]
    }
  }
}
```

---

## 📄 PAGE 5: Apply Page

**Route:** `/jobs/[id]/apply`

### Endpoint 1: `GET /api/jobs/:id/apply`

**Description:** Get application materials (rewritten resume + generated responses)

#### Request

```typescript
// URL Params
{
  "id": "1"  // Job ID
}
```

#### Response

```typescript
{
  "status": "success",
  "job": {
    "id": "1",
    "title": "Full Stack Developer (Python + TypeScript)",
    "company": "Michael Page"
  },
  "application_materials": {
    "rewritten_resume": {
      "download_url": "https://api.aiverse.com/resumes/rewritten_123.pdf",
      "content": "... (optional: plain text version)"
    },
    "generated_responses": {
      "why_join": "I am excited about the opportunity to join Michael Page because of its innovative approach to technology and commitment to excellence. The Full Stack Developer role aligns perfectly with my career aspirations and technical expertise...",
      "short_description": "I am a passionate software engineer with hands-on experience in building scalable applications and solving complex technical challenges. My background includes working with cross-functional teams...",
      "additional_info": "Throughout my career, I have demonstrated strong problem-solving abilities and a commitment to writing clean, maintainable code. I am experienced in agile methodologies..."
    }
  }
}
```

### Endpoint 2: `POST /api/jobs/:id/apply` (Optional - for tracking)

**Description:** Track that user has applied to a job

#### Request

```typescript
{
  "job_id": "1",
  "applied_at": "2025-12-31T10:30:00Z"
}
```

#### Response

```typescript
{
  "status": "success",
  "message": "Application tracked successfully"
}
```

---

## 📊 TypeScript Interfaces Summary

```typescript
// Core Types
interface RoadmapResource {
  name: string;
  url: string;
}

interface RoadmapDay {
  day: number;
  topic: string;
  tasks: string[];
  resources: RoadmapResource[];
}

interface RoadmapDetails {
  missing_skills: string[];
  roadmap: RoadmapDay[];
}

interface Job {
  id: string;
  score: number; // 0-1 decimal (e.g., 0.55 = 55% match)
  title: string;
  company: string;
  description: string;
  link: string; // "null" string or actual URL
  status: "Learning Path Required" | "Ready to Apply";
  action: "Start Roadmap" | "Apply Now";
  roadmap_details: RoadmapDetails;
}

interface JobsResponse {
  status: "success" | "error";
  count: number;
  matches: Job[];
}

interface ApplicationMaterials {
  rewritten_resume: {
    download_url: string;
    content?: string;
  };
  generated_responses: {
    why_join: string;
    short_description: string;
    additional_info: string;
  };
}

interface UserProfile {
  name: string;
  email: string;
  skills: string[];
  experience_years: number;
  education: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  work_history: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
}
```

---

## 🔗 API Endpoints Summary

| Method | Endpoint              | Description                        |
| ------ | --------------------- | ---------------------------------- |
| POST   | `/api/resume/upload`  | Upload and process resume          |
| GET    | `/api/jobs/matches`   | Get all matched jobs with roadmaps |
| GET    | `/api/jobs/:id`       | Get single job details             |
| GET    | `/api/jobs/:id/apply` | Get application materials          |
| POST   | `/api/jobs/:id/apply` | Track application (optional)       |

---

## ⚠️ Important Notes

1. **Score Format:** Backend should send scores as decimals (0-1). Frontend multiplies by 100 for display.

2. **Link Field:** Use `"null"` string if no link available, or actual URL string.

3. **Status Logic:**

   - If `score >= 0.80`: `status = "Ready to Apply"`, `action = "Apply Now"`
   - If `score < 0.80`: `status = "Learning Path Required"`, `action = "Start Roadmap"`

4. **Roadmap Generation:** Backend should generate personalized roadmaps based on:

   - User's current skills (from resume)
   - Job's required skills
   - Gap analysis between the two

5. **Generated Responses:** Should be personalized using:
   - User's profile data
   - Job description
   - Company information
