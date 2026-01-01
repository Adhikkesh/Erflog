"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/SessionContext";
import { useInterview, Message } from "@/lib/useInterview";
import LiveStatusBadge from "@/components/LiveStatusBadge";
import {
  MessageCircle,
  Send,
  RotateCcw,
  Bot,
  User,
  Loader2,
  Briefcase,
  AlertCircle,
} from "lucide-react";

export default function InterviewPage() {
  const { profile, strategyJobs } = useSession();
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [inputMessage, setInputMessage] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Build job context from selected job or default to profile summary
  const jobContext = selectedJob
    ? `Job: ${selectedJob}`
    : profile
    ? `${profile.experience_summary} with skills: ${profile.skills
        .slice(0, 5)
        .join(", ")}`
    : "General technical role";

  const {
    messages,
    stage,
    messageCount,
    isLoading,
    error,
    startInterview,
    sendMessage,
    resetInterview,
    clearError,
  } = useInterview(jobContext);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartInterview = async () => {
    setHasStarted(true);
    await startInterview();
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    const msg = inputMessage;
    setInputMessage("");
    await sendMessage(msg);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    resetInterview();
    setHasStarted(false);
    setInputMessage("");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Get stage color
  const getStageColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      Introduction: "#10B981",
      "Technical Questions": "#3B82F6",
      "Behavioral Questions": "#8B5CF6",
      "Problem Solving": "#F59E0B",
      Feedback: "#D95D39",
    };
    return stageColors[stage] || "#6B7280";
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header */}
      <div className="bg-white border-b" style={{ borderColor: "#E5E0D8" }}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#D95D39" }}
              >
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-serif-bold text-xl text-ink">
                  AI Interview Practice
                </h1>
                <p className="text-sm text-secondary">
                  Practice with your AI interviewer
                </p>
              </div>
            </div>
            <LiveStatusBadge />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {!hasStarted ? (
          /* Pre-Interview Setup */
          <div className="flex-1 flex items-center justify-center px-6 py-12">
            <div
              className="bg-white rounded-2xl border p-8 max-w-lg w-full"
              style={{ borderColor: "#E5E0D8" }}
            >
              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "#FFF3ED" }}
                >
                  <Bot className="w-8 h-8" style={{ color: "#D95D39" }} />
                </div>
                <h2 className="font-serif-bold text-2xl text-ink mb-2">
                  Ready to Practice?
                </h2>
                <p className="text-secondary">
                  Select a job role and start a mock interview session with AI
                </p>
              </div>

              {/* Job Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink mb-2">
                  <Briefcase className="w-4 h-4 inline mr-2" />
                  Interview for:
                </label>
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border bg-white text-ink focus:outline-none focus:ring-2"
                  style={
                    {
                      borderColor: "#E5E0D8",
                      "--tw-ring-color": "#D95D39",
                    } as React.CSSProperties
                  }
                >
                  <option value="">
                    {profile
                      ? `General - ${profile.name}`
                      : "General Technical Interview"}
                  </option>
                  {strategyJobs.map((job, index) => (
                    <option key={job.id || index} value={job.title}>
                      {job.title} at {job.company}
                    </option>
                  ))}
                </select>
                {strategyJobs.length === 0 && (
                  <p className="text-xs text-secondary mt-2">
                    💡 Generate a job strategy on the Dashboard to see
                    personalized job options
                  </p>
                )}
              </div>

              {/* Profile Info */}
              {profile && (
                <div
                  className="mb-6 p-4 rounded-lg bg-gray-50 border"
                  style={{ borderColor: "#E5E0D8" }}
                >
                  <p className="text-sm text-secondary mb-2">Your Profile:</p>
                  <p className="font-medium text-ink">{profile.name}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-full text-xs bg-white border"
                        style={{ borderColor: "#E5E0D8" }}
                      >
                        {skill}
                      </span>
                    ))}
                    {profile.skills.length > 4 && (
                      <span className="text-xs text-secondary">
                        +{profile.skills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Start Button */}
              <button
                onClick={handleStartInterview}
                disabled={isLoading}
                className="w-full py-4 rounded-xl font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#D95D39" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting Interview...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5" />
                    Start Interview
                  </>
                )}
              </button>

              {!profile && (
                <p className="text-center text-xs text-secondary mt-4">
                  <a
                    href="/"
                    className="underline"
                    style={{ color: "#D95D39" }}
                  >
                    Upload your resume
                  </a>{" "}
                  for a personalized interview experience
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Interview Chat */
          <>
            {/* Stage Indicator */}
            <div
              className="px-6 py-3 bg-white border-b"
              style={{ borderColor: "#E5E0D8" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: getStageColor(stage) }}
                  >
                    {stage}
                  </span>
                  <span className="text-sm text-secondary">
                    Message {messageCount}
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-secondary hover:bg-gray-100 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  New Interview
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {messages.map((message: Message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                        message.role === "user" ? "bg-gray-200" : ""
                      }`}
                      style={
                        message.role === "assistant"
                          ? { backgroundColor: "#D95D39" }
                          : {}
                      }
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4 text-gray-600" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[70%] ${
                        message.role === "user" ? "text-right" : ""
                      }`}
                    >
                      <div
                        className={`inline-block px-4 py-3 rounded-2xl ${
                          message.role === "user"
                            ? "bg-gray-100 text-ink rounded-br-md"
                            : "bg-white border text-ink rounded-bl-md"
                        }`}
                        style={
                          message.role === "assistant"
                            ? { borderColor: "#E5E0D8" }
                            : {}
                        }
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className="text-xs text-secondary mt-1">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && messages.length > 0 && (
                  <div className="flex gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: "#D95D39" }}
                    >
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div
                      className="bg-white border px-4 py-3 rounded-2xl rounded-bl-md"
                      style={{ borderColor: "#E5E0D8" }}
                    >
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-secondary" />
                        <span className="text-secondary text-sm">
                          Thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mx-6 mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
                <button
                  onClick={clearError}
                  className="ml-auto text-xs underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Input Area */}
            <div
              className="px-6 py-4 bg-white border-t"
              style={{ borderColor: "#E5E0D8" }}
            >
              <div className="flex gap-3">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your response..."
                  rows={1}
                  className="flex-1 px-4 py-3 rounded-xl border bg-white text-ink resize-none focus:outline-none focus:ring-2"
                  style={
                    {
                      borderColor: "#E5E0D8",
                      "--tw-ring-color": "#D95D39",
                    } as React.CSSProperties
                  }
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-5 py-3 rounded-xl font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: "#D95D39" }}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-secondary mt-2 text-center">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
