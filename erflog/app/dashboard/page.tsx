"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AgentTerminal, { AgentLog } from "@/components/AgentTerminal";
import {
  Bot,
  Zap,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Building2,
  RefreshCw,
} from "lucide-react";
import { useSession } from "@/lib/SessionContext";
import type { StrategyJobMatch } from "@/lib/api";

interface JobMatch {
  id: string;
  title: string;
  company: string;
  matchScore: number;
  location: string;
  salary?: string;
  skills: string[];
  gapSkills?: string[];
  description?: string;
  link?: string;
}

function JobCard({ job, index }: { job: JobMatch; index: number }) {
  const router = useRouter();
  const isReady = job.matchScore >= 80;
  const hasGaps = job.gapSkills && job.gapSkills.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group relative bg-surface rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
      style={{ borderColor: "#E5E0D8" }}
    >
      {/* Match Score Indicator */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          backgroundColor: isReady
            ? "#22c55e"
            : hasGaps
            ? "#f59e0b"
            : "#D95D39",
        }}
      />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-serif-bold text-lg"
              style={{ backgroundColor: "#D95D39" }}
            >
              {job.company.charAt(0)}
            </div>
            <div>
              <h3 className="font-serif-bold text-lg text-ink line-clamp-1">
                {job.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-secondary">
                <Building2 className="w-3.5 h-3.5" />
                {job.company}
              </div>
            </div>
          </div>

          {/* Match Score */}
          <div className="text-right">
            <div
              className="text-2xl font-bold"
              style={{ color: isReady ? "#22c55e" : "#D95D39" }}
            >
              {job.matchScore}%
            </div>
            <div className="text-xs text-secondary">Match</div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          {isReady ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ready to Deploy
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              Gap Detected
            </span>
          )}
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="px-2 py-1 rounded text-xs bg-gray-100 text-ink"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="px-2 py-1 rounded text-xs bg-gray-100 text-secondary">
              +{job.skills.length - 4}
            </span>
          )}
        </div>

        {/* Gap Skills (if any) */}
        {hasGaps && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="text-xs font-medium text-amber-700 mb-2">
              Skills to Develop:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {job.gapSkills?.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Location & Salary */}
        <div className="flex items-center justify-between text-sm text-secondary mb-4">
          <span>{job.location}</span>
          {job.salary && <span>{job.salary}</span>}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isReady ? (
            <button
              onClick={() => router.push(`/jobs/${job.id}/apply`)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: "#D95D39" }}
            >
              <Zap className="w-4 h-4" />
              Deploy Kit
            </button>
          ) : (
            <>
              <button
                onClick={() => router.push(`/jobs/${job.id}`)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border font-medium transition-all hover:bg-gray-50"
                style={{ borderColor: "#E5E0D8" }}
              >
                <Target className="w-4 h-4" />
                View Roadmap
              </button>
              <button
                onClick={() => router.push(`/jobs/${job.id}/apply`)}
                className="flex items-center justify-center px-4 py-3 rounded-lg text-white font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: "#D95D39" }}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { runStrategy, strategyJobs, profile, isLoading, error, sessionId } =
    useSession();

  const [showJobs, setShowJobs] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [apiComplete, setApiComplete] = useState(false);
  const hasRunStrategyRef = useRef(false);

  // Simulation steps that play while API is loading
  const simulationSteps = [
    {
      agent: "System",
      message: "Initializing AI pipeline...",
      type: "agent" as const,
    },
    {
      agent: "Agent 2 (Profiler)",
      message: `Loading profile for ${profile?.name || "user"}...`,
      type: "agent" as const,
    },
    {
      agent: "Agent 2",
      message: `Extracting ${
        profile?.skills.length || 0
      } skills from resume...`,
      type: "success" as const,
    },
    {
      agent: "Agent 3 (Strategist)",
      message: "Connecting to job market database...",
      type: "agent" as const,
    },
    {
      agent: "Agent 3",
      message: "Scanning 10,000+ active job listings...",
      type: "agent" as const,
    },
    {
      agent: "Agent 3",
      message: "Building skill-to-job embedding matrix...",
      type: "agent" as const,
    },
    {
      agent: "Agent 3",
      message: "Computing cosine similarity vectors...",
      type: "agent" as const,
    },
    {
      agent: "Agent 3",
      message: "Applying TF-IDF weighting to matches...",
      type: "agent" as const,
    },
    {
      agent: "Agent 3",
      message: "Ranking top candidates by alignment score...",
      type: "agent" as const,
    },
    {
      agent: "Agent 4 (Gap Analyzer)",
      message: "Detecting skill gaps for each match...",
      type: "agent" as const,
    },
    {
      agent: "Agent 4",
      message: "Mapping missing competencies to learning paths...",
      type: "agent" as const,
    },
    {
      agent: "Agent 4",
      message: "Generating personalized 7-day roadmaps...",
      type: "agent" as const,
    },
    {
      agent: "Agent 4",
      message: "Curating resources from top platforms...",
      type: "agent" as const,
    },
    {
      agent: "Agent 5 (Kit Builder)",
      message: "Preparing deployment kits...",
      type: "agent" as const,
    },
    {
      agent: "Agent 5",
      message: "Generating tailored cover letter templates...",
      type: "agent" as const,
    },
    {
      agent: "Agent 5",
      message: "Optimizing resume highlights for each role...",
      type: "agent" as const,
    },
    // These will loop if API takes longer
    {
      agent: "System",
      message: "Processing large dataset, please wait...",
      type: "agent" as const,
    },
    {
      agent: "Agent 3",
      message: "Fine-tuning match rankings...",
      type: "agent" as const,
    },
    {
      agent: "Agent 4",
      message: "Optimizing roadmap sequences...",
      type: "agent" as const,
    },
    {
      agent: "Agent 5",
      message: "Finalizing application materials...",
      type: "agent" as const,
    },
  ];

  // Transform strategy jobs to JobMatch format
  const transformStrategyJobs = useCallback(
    (strategyJobs: StrategyJobMatch[]): JobMatch[] => {
      return strategyJobs.map((job, index) => {
        const score = Math.round(job.score * 100);
        const missingSkills = job.roadmap_details?.missing_skills || [];

        // Extract skills from description (simple extraction)
        const commonSkills = [
          "Python",
          "JavaScript",
          "TypeScript",
          "React",
          "Node.js",
          "AWS",
          "Docker",
          "Kubernetes",
        ];
        const skills = commonSkills
          .filter(
            (skill) =>
              job.description?.toLowerCase().includes(skill.toLowerCase()) ||
              job.title.toLowerCase().includes(skill.toLowerCase())
          )
          .slice(0, 4);

        return {
          id: job.id || String(index + 1),
          title: job.title,
          company: job.company,
          matchScore: score,
          location: job.link && job.link !== "null" ? "See posting" : "Remote",
          skills: skills.length > 0 ? skills : ["Technical Skills"],
          gapSkills: missingSkills.length > 0 ? missingSkills : undefined,
          description: job.description,
          link: job.link,
        };
      });
    },
    []
  );

  // Run the agent workflow on mount
  useEffect(() => {
    const runAgentWorkflow = async () => {
      if (!sessionId) {
        router.push("/");
        return;
      }

      if (!profile) {
        router.push("/");
        return;
      }

      if (hasRunStrategyRef.current) {
        return;
      }
      hasRunStrategyRef.current = true;

      // Start the API call immediately
      const strategyPromise = runStrategy();

      // Wait for API to complete
      const success = await strategyPromise;
      setApiComplete(true);

      // Add final success message
      setAgentLogs((prev) => [
        ...prev,
        {
          id: `final-${Date.now()}`,
          agent: "System",
          message: success
            ? "✓ Strategy Board Ready - Found matching opportunities!"
            : "✓ Loaded from cache (5-min validity)",
          type: "success",
          delay: 100,
        },
      ]);
    };

    runAgentWorkflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, profile]);

  // Simulation effect - adds logs progressively while API is loading
  useEffect(() => {
    if (!isInitializing || apiComplete) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const nextStep = prev + 1;
        // Loop back if we've gone through all steps and API isn't done
        const stepIndex =
          nextStep >= simulationSteps.length
            ? simulationSteps.length - 4 + (nextStep % 4) // Loop last 4 steps
            : nextStep;

        if (stepIndex < simulationSteps.length) {
          const step = simulationSteps[stepIndex];
          setAgentLogs((logs) => [
            ...logs,
            {
              id: `step-${Date.now()}-${nextStep}`,
              agent: step.agent,
              message: step.message,
              type: step.type,
              delay: 200,
            },
          ]);
        }
        return nextStep;
      });
    }, 1200); // Add a new log every 1.2 seconds

    // Start with first log immediately
    if (currentStep === 0 && simulationSteps.length > 0) {
      const firstStep = simulationSteps[0];
      setAgentLogs([
        {
          id: `step-0`,
          agent: firstStep.agent,
          message: firstStep.message,
          type: firstStep.type,
          delay: 100,
        },
      ]);
      setCurrentStep(1);
    }

    return () => clearInterval(interval);
  }, [isInitializing, apiComplete, currentStep, simulationSteps]);

  // Update jobs when strategyJobs changes
  useEffect(() => {
    if (strategyJobs.length > 0) {
      setJobs(transformStrategyJobs(strategyJobs));
    }
  }, [strategyJobs, transformStrategyJobs]);

  const handleAgentComplete = () => {
    setTimeout(() => {
      setIsInitializing(false);
      setShowJobs(true);
    }, 500);
  };

  const handleRefresh = async () => {
    setIsInitializing(true);
    setShowJobs(false);
    setAgentLogs([]);
    setCurrentStep(0);
    setApiComplete(false);
    hasRunStrategyRef.current = false;

    // Add initial refresh log
    setAgentLogs([
      {
        id: "refresh-start",
        agent: "System",
        message: "Force refresh initiated - bypassing 5-min cache...",
        type: "agent",
        delay: 100,
      },
    ]);
    setCurrentStep(1);

    // Start refresh API call
    const success = await runStrategy(undefined, true);
    setApiComplete(true);

    // Add completion log
    setAgentLogs((prev) => [
      ...prev,
      {
        id: `refresh-complete-${Date.now()}`,
        agent: "System",
        message: success
          ? "✓ Strategy Board Refreshed Successfully!"
          : "✓ Refresh complete",
        type: "success",
        delay: 100,
      },
    ]);
  };

  // Stats
  const readyJobs = jobs.filter((j) => j.matchScore >= 80).length;
  const gapJobs = jobs.filter((j) => j.matchScore < 80).length;
  const avgMatch =
    jobs.length > 0
      ? Math.round(jobs.reduce((acc, j) => acc + j.matchScore, 0) / jobs.length)
      : 0;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Agent Overlay */}
      <AnimatePresence>
        {isInitializing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/95 backdrop-blur-sm"
          >
            <div className="w-full max-w-2xl px-8">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <div className="flex items-center justify-center gap-3 mb-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#D95D39" }}
                  >
                    <Bot className="w-7 h-7 text-white" />
                  </motion.div>
                </div>
                <h2 className="font-serif-bold text-3xl text-ink mb-2">
                  Multi-Agent Orchestration
                </h2>
                <p className="text-secondary mb-3">
                  {profile
                    ? `Analyzing career opportunities for ${profile.name}...`
                    : "Coordinating swarm intelligence..."}
                </p>

                {/* Progress indicator */}
                <div className="max-w-md mx-auto mb-4">
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: "#D95D39" }}
                      initial={{ width: "0%" }}
                      animate={{
                        width: apiComplete
                          ? "100%"
                          : ["0%", "70%", "85%", "90%"],
                      }}
                      transition={{
                        duration: apiComplete ? 0.3 : 30,
                        ease: apiComplete ? "easeOut" : "easeInOut",
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-secondary">
                    <span>Processing</span>
                    <span>{apiComplete ? "Complete!" : "Please wait..."}</span>
                  </div>
                </div>

                <p className="text-xs text-secondary/70">
                  ⏱️ First-time analysis takes 30-60 seconds. Subsequent loads
                  use cached data.
                </p>
              </motion.div>

              <AgentTerminal
                logs={agentLogs}
                onComplete={handleAgentComplete}
                title="Swarm Coordinator v2.0"
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-amber-600 text-sm mt-4"
                >
                  {error} - Using cached data if available
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="py-12 px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showJobs ? 1 : 0, y: showJobs ? 0 : 20 }}
          className="max-w-7xl mx-auto mb-12"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif-bold text-4xl text-ink mb-2">
                Strategy Board
              </h1>
              <p className="text-secondary">
                {profile
                  ? `Job matches for ${profile.name}, ranked by compatibility`
                  : "Your personalized job matches, ranked by compatibility"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition-all hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: "#E5E0D8" }}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                style={{ backgroundColor: "#D95D39", color: "white" }}
              >
                <Sparkles className="w-4 h-4" />
                {jobs.length} Matches Found
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface rounded-xl border p-6"
              style={{ borderColor: "#E5E0D8" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-ink">{readyJobs}</div>
                  <div className="text-sm text-secondary">Ready to Deploy</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-surface rounded-xl border p-6"
              style={{ borderColor: "#E5E0D8" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-ink">{gapJobs}</div>
                  <div className="text-sm text-secondary">Gaps Detected</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-surface rounded-xl border p-6"
              style={{ borderColor: "#E5E0D8" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <TrendingUp
                    className="w-5 h-5"
                    style={{ color: "#D95D39" }}
                  />
                </div>
                <div>
                  <div className="text-2xl font-bold text-ink">{avgMatch}%</div>
                  <div className="text-sm text-secondary">Avg Match Score</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Job Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showJobs ? 1 : 0 }}
          className="max-w-7xl mx-auto"
        >
          {jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job, index) => (
                <JobCard key={job.id} job={job} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-secondary">
                No job matches found. Try uploading a new resume.
              </p>
              <button
                onClick={() => router.push("/")}
                className="mt-4 px-6 py-3 rounded-lg font-medium text-white"
                style={{ backgroundColor: "#D95D39" }}
              >
                Upload Resume
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
