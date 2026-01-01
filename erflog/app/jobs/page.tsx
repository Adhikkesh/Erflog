"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LiveStatusBadge from "@/components/LiveStatusBadge";
import { useSession } from "@/lib/SessionContext";
import type { StrategyJobMatch } from "@/lib/api";
import { Search, Loader2 } from "lucide-react";

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
  tier?: string;
  ui_color?: string;
  roadmap_details: RoadmapDetails | null;
}

export default function JobsPage() {
  const router = useRouter();
  const { profile, strategyJobs } = useSession();
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);

  // Transform strategy jobs to Job format
  const transformStrategyJobs = (results: StrategyJobMatch[]): Job[] => {
    return results.map((result, index) => ({
      id: result.id || String(index + 1),
      score: result.score,
      title: result.title,
      company: result.company,
      description: result.description,
      link: result.link,
      status: result.status || "Gap Detected",
      action: result.action || "Start Roadmap",
      tier: result.tier,
      ui_color: result.ui_color,
      roadmap_details: result.roadmap_details
        ? {
            missing_skills: result.roadmap_details.missing_skills,
            roadmap: result.roadmap_details.roadmap.map((day) => ({
              day: day.day,
              topic: day.topic,
              task: day.task,
              tasks: day.task ? [day.task] : [],
              resources: day.resources,
            })),
          }
        : null,
    }));
  };

  // Load from strategy jobs on mount
  useEffect(() => {
    if (strategyJobs.length > 0) {
      const transformed = transformStrategyJobs(strategyJobs);
      setJobs(transformed);
      setFilteredJobs(transformed);
    }
  }, [strategyJobs]);

  const toggleJobExpand = (id: string) => {
    setExpandedJobId(expandedJobId === id ? null : id);
  };

  const getMatchPercentage = (score: number) => {
    return Math.round(score * 100);
  };

  return (
    <div className="min-h-screen bg-canvas py-12 px-8">
      {/* Header Section */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif-bold text-4xl text-ink">Job Opportunities</h1>
        <LiveStatusBadge />
      </div>

      {/* Search/Filter Section */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter jobs by title, company, or keywords..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border bg-white text-ink focus:outline-none focus:ring-2"
              style={
                {
                  borderColor: "#E5E0D8",
                  "--tw-ring-color": "#D95D39",
                } as React.CSSProperties
              }
            />
          </div>
        </div>

        {/* Info message */}
        {jobs.length === 0 && (
          <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
            Jobs are loaded from your dashboard strategy. Go to the{" "}
            <a href="/dashboard" className="underline font-medium">
              Dashboard
            </a>{" "}
            to generate personalized job matches.
          </div>
        )}
      </div>

      {/* Job List */}
      <div className="flex flex-col gap-4 max-w-4xl mx-auto">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-surface rounded-xl border border-surface overflow-hidden transition-all duration-300"
              style={{ borderColor: "#E5E0D8" }}
            >
              {/* Job Header - Clickable */}
              <div
                onClick={() => toggleJobExpand(job.id)}
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Company Initial */}
                    <div
                      className="h-14 w-14 rounded-full flex-shrink-0 flex items-center justify-center font-serif-bold text-xl text-white"
                      style={{ backgroundColor: "#D95D39" }}
                    >
                      {job.company.charAt(0)}
                    </div>
                    <div>
                      <h2 className="font-serif-bold text-xl text-ink">
                        {job.title}
                      </h2>
                      <p className="text-secondary mt-1">{job.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Match Score */}
                    <div className="text-right">
                      <div
                        className="text-2xl font-bold"
                        style={{ color: "#D95D39" }}
                      >
                        {getMatchPercentage(job.score)}%
                      </div>
                      <div className="text-xs text-secondary">Match</div>
                    </div>
                    {/* Expand Arrow */}
                    <svg
                      className={`w-6 h-6 text-secondary transition-transform duration-300 ${
                        expandedJobId === job.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedJobId === job.id && (
                <div className="border-t" style={{ borderColor: "#E5E0D8" }}>
                  {/* Description */}
                  <div className="p-6 bg-gray-50">
                    <h3 className="font-serif-bold text-lg text-ink mb-3">
                      Job Description
                    </h3>
                    <p className="text-secondary leading-relaxed">
                      {job.description}
                    </p>

                    {job.link !== "null" && (
                      <a
                        href={job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-3 text-sm underline"
                        style={{ color: "#D95D39" }}
                      >
                        View Original Posting →
                      </a>
                    )}
                  </div>

                  {/* Missing Skills */}
                  {job.roadmap_details &&
                    job.roadmap_details.missing_skills.length > 0 && (
                      <div
                        className="p-6 border-t"
                        style={{ borderColor: "#E5E0D8" }}
                      >
                        <h3 className="font-serif-bold text-lg text-ink mb-4">
                          Skills to Develop
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {job.roadmap_details.missing_skills.map(
                            (skill, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 rounded-full text-sm font-medium bg-orange-100"
                                style={{ color: "#D95D39" }}
                              >
                                {skill}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Learning Roadmap */}
                  {job.roadmap_details &&
                    job.roadmap_details.roadmap.length > 0 && (
                      <div
                        className="p-6 border-t"
                        style={{ borderColor: "#E5E0D8" }}
                      >
                        <h3 className="font-serif-bold text-lg text-ink mb-6">
                          Learning Roadmap
                        </h3>
                        <div className="space-y-6">
                          {job.roadmap_details.roadmap.map((day, idx) => (
                            <div key={idx} className="relative pl-8">
                              {/* Timeline Line */}
                              {job.roadmap_details &&
                                idx <
                                  job.roadmap_details.roadmap.length - 1 && (
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
                              <div
                                className="bg-white rounded-lg border p-5"
                                style={{ borderColor: "#E5E0D8" }}
                              >
                                <h4 className="font-serif-bold text-ink mb-3">
                                  {day.topic}
                                </h4>

                                {/* Tasks */}
                                <div className="mb-4">
                                  <p className="text-sm font-medium text-secondary mb-2">
                                    Tasks:
                                  </p>
                                  <ul className="space-y-2">
                                    {(
                                      day.tasks || (day.task ? [day.task] : [])
                                    ).map((task, taskIdx) => (
                                      <li
                                        key={taskIdx}
                                        className="flex items-start gap-2 text-sm text-ink"
                                      >
                                        <span
                                          className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                          style={{ backgroundColor: "#D95D39" }}
                                        />
                                        {task}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Resources */}
                                <div>
                                  <p className="text-sm font-medium text-secondary mb-2">
                                    Resources:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {day.resources.map((resource, resIdx) => (
                                      <a
                                        key={resIdx}
                                        href={resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-ink hover:bg-gray-200 transition-colors"
                                      >
                                        <svg
                                          className="w-3 h-3"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                          />
                                        </svg>
                                        {resource.name}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Apply Button */}
                  <div
                    className="p-6 border-t bg-gray-50"
                    style={{ borderColor: "#E5E0D8" }}
                  >
                    <button
                      onClick={() => router.push(`/jobs/${job.id}/apply`)}
                      className="w-full py-4 rounded-lg font-medium text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: "#D95D39" }}
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : jobs.length > 0 ? (
          <div className="text-center py-12">
            <p className="text-secondary mb-4">No jobs match your filter.</p>
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50 transition-colors"
              style={{ borderColor: "#E5E0D8" }}
            >
              Clear Filter
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto mb-4 text-secondary" />
            <p className="text-secondary mb-2">No job opportunities yet</p>
            <p className="text-sm text-secondary mb-4">
              Upload your resume and generate a strategy on the Dashboard to see
              personalized job matches
            </p>
            <a
              href="/dashboard"
              className="inline-block px-6 py-3 rounded-lg font-medium text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "#D95D39" }}
            >
              Go to Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
