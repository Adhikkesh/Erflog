"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/SessionContext";
import { ArrowLeft, ExternalLink } from "lucide-react";

interface RoadmapResource {
  name: string;
  url: string;
}

interface RoadmapDay {
  day: number;
  topic: string;
  task?: string;
  tasks?: string[];
  resources: RoadmapResource[];
}

interface RoadmapDetails {
  missing_skills: string[];
  roadmap: RoadmapDay[];
}

interface Job {
  id: string;
  score: number;
  title: string;
  company: string;
  description: string;
  link: string;
  status: string;
  action: string;
  roadmap_details: RoadmapDetails | null;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const { strategyJobs } = useSession();

  // Find job from strategy jobs
  const foundJob = strategyJobs.find((j) => j.id === jobId);

  // Transform to Job interface
  const job: Job | null = foundJob
    ? {
        id: foundJob.id,
        score: foundJob.score,
        title: foundJob.title,
        company: foundJob.company,
        description: foundJob.description,
        link: foundJob.link,
        status: foundJob.status || "Learning Path Required",
        action: foundJob.action || "Start Roadmap",
        roadmap_details: foundJob.roadmap_details
          ? {
              missing_skills: foundJob.roadmap_details.missing_skills,
              roadmap: foundJob.roadmap_details.roadmap.map((day) => ({
                day: day.day,
                topic: day.topic,
                task: day.task,
                tasks: day.task ? [day.task] : [],
                resources: day.resources,
              })),
            }
          : null,
      }
    : null;

  const getMatchPercentage = (score: number) => Math.round(score * 100);

  if (!job) {
    return (
      <div className="min-h-screen bg-canvas py-12 px-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif-bold text-3xl text-ink mb-4">
            Job Not Found
          </h1>
          <p className="text-secondary mb-6">
            The job you&apos;re looking for doesn&apos;t exist.
          </p>
          <button
            onClick={() => router.push("/jobs")}
            className="px-6 py-3 rounded-lg font-medium text-white"
            style={{ backgroundColor: "#D95D39" }}
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas py-12 px-8">
      {/* Back Button */}
      <button
        onClick={() => router.push("/jobs")}
        className="mb-8 flex items-center gap-2 text-secondary hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Jobs
      </button>

      <div className="max-w-4xl mx-auto">
        {/* Job Header */}
        <div
          className="bg-surface rounded-xl border p-8 mb-6"
          style={{ borderColor: "#E5E0D8" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center font-serif-bold text-2xl text-white"
                style={{ backgroundColor: "#D95D39" }}
              >
                {job.company.charAt(0)}
              </div>
              <div>
                <h1 className="font-serif-bold text-3xl text-ink">
                  {job.title}
                </h1>
                <p className="text-xl text-secondary mt-1">{job.company}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: "#D95D39" }}>
                {getMatchPercentage(job.score)}%
              </div>
              <div className="text-sm text-secondary">Match Score</div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div
          className="bg-surface rounded-xl border p-6 mb-6"
          style={{ borderColor: "#E5E0D8" }}
        >
          <h2 className="font-serif-bold text-xl text-ink mb-4">
            Job Description
          </h2>
          <p className="text-secondary leading-relaxed">{job.description}</p>
          {job.link !== "null" && job.link && (
            <a
              href={job.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-sm font-medium"
              style={{ color: "#D95D39" }}
            >
              View Original Posting
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Missing Skills */}
        {job.roadmap_details &&
          job.roadmap_details.missing_skills.length > 0 && (
            <div
              className="bg-surface rounded-xl border p-6 mb-6"
              style={{ borderColor: "#E5E0D8" }}
            >
              <h2 className="font-serif-bold text-xl text-ink mb-4">
                Skills to Develop
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.roadmap_details.missing_skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 rounded-full text-sm font-medium bg-orange-100"
                    style={{ color: "#D95D39" }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* Learning Roadmap */}
        {job.roadmap_details && job.roadmap_details.roadmap.length > 0 && (
          <div
            className="bg-surface rounded-xl border p-6 mb-6"
            style={{ borderColor: "#E5E0D8" }}
          >
            <h2 className="font-serif-bold text-xl text-ink mb-6">
              Learning Roadmap
            </h2>
            <div className="space-y-4">
              {job.roadmap_details.roadmap.map((day, idx) => (
                <div key={idx} className="relative pl-8">
                  {/* Timeline Line */}
                  {job.roadmap_details &&
                    idx < job.roadmap_details.roadmap.length - 1 && (
                      <div
                        className="absolute left-3 top-8 w-0.5 h-full"
                        style={{ backgroundColor: "#E5E0D8" }}
                      />
                    )}

                  {/* Day Circle */}
                  <div
                    className="absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: "#D95D39" }}
                  >
                    {day.day}
                  </div>

                  {/* Day Content */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <h3 className="font-serif-bold text-ink mb-3">
                      {day.topic}
                    </h3>

                    {/* Tasks */}
                    <ul className="space-y-2 mb-4">
                      {(day.tasks || (day.task ? [day.task] : [])).map(
                        (task, taskIdx) => (
                          <li
                            key={taskIdx}
                            className="flex items-start gap-2 text-sm text-secondary"
                          >
                            <span
                              className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: "#D95D39" }}
                            />
                            {task}
                          </li>
                        )
                      )}
                    </ul>

                    {/* Resources */}
                    <div className="flex flex-wrap gap-2">
                      {day.resources.map((resource, resIdx) => (
                        <a
                          key={resIdx}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border text-ink hover:bg-gray-100 transition-colors"
                          style={{ borderColor: "#E5E0D8" }}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {resource.name}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Apply Button */}
        <button
          onClick={() => router.push(`/jobs/${job.id}/apply`)}
          className="w-full py-4 rounded-xl font-medium text-white text-lg transition-all hover:opacity-90"
          style={{ backgroundColor: "#D95D39" }}
        >
          Apply Now
        </button>
      </div>
    </div>
  );
}
