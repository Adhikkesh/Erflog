"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Bot, User, AlertCircle, RotateCcw } from "lucide-react";

// Hardcoded for testing
const JOB_ID = "1";
const USER_ID = "9f3eef8e-635b-46cc-a088-affae97c9a2b";
const WS_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("http", "ws") ||
  "ws://localhost:8000";

type InterviewStage = "intro" | "resume" | "challenge" | "conclusion" | "end";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Feedback {
  score?: number;
  verdict?: string;
  summary?: string;
  gap_analysis_update?: string;
}

export default function TextInterviewPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [currentStage, setCurrentStage] = useState<InterviewStage>("intro");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "event") {
        if (data.event === "thinking") {
          setIsThinking(data.status === "start");
        } else if (data.event === "stage_change") {
          setCurrentStage(data.stage as InterviewStage);
        }
      } else if (data.type === "message") {
        setMessages((prev) => [
          ...prev,
          {
            id: `${data.role}-${Date.now()}`,
            role: data.role,
            content: data.content,
            timestamp: new Date(),
          },
        ]);
      } else if (data.type === "feedback") {
        setFeedback(data.data);
      } else if (data.type === "error") {
        setError(data.message);
      }
    } catch (e) {
      console.error("Failed to parse message:", e);
    }
  }, []);

  // Start WebSocket connection
  const startInterview = useCallback(() => {
    setError(null);
    setMessages([]);
    setFeedback(null);
    setIsConnecting(true);

    const ws = new WebSocket(`${WS_URL}/ws/interview/text/${JOB_ID}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setIsConnecting(false);
    };

    ws.onmessage = handleMessage;

    ws.onerror = (e) => {
      console.error("WebSocket error:", e);
      setError("Connection error. Make sure the backend is running.");
      setIsConnecting(false);
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [handleMessage]);

  // Send message
  const sendMessage = useCallback(() => {
    if (
      !inputMessage.trim() ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    )
      return;

    const msg = inputMessage.trim();
    setInputMessage("");

    // Add user message to UI
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: msg,
        timestamp: new Date(),
      },
    ]);

    // Send to server
    wsRef.current.send(JSON.stringify({ message: msg }));
  }, [inputMessage]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Reset interview
  const resetInterview = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setMessages([]);
    setCurrentStage("intro");
    setFeedback(null);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Stage display info
  const getStageInfo = (stage: InterviewStage) => {
    const stages: Record<
      InterviewStage,
      { label: string; color: string; progress: number }
    > = {
      intro: { label: "Introduction", color: "#10B981", progress: 20 },
      resume: { label: "Resume Deep-Dive", color: "#3B82F6", progress: 40 },
      challenge: {
        label: "Challenging Questions",
        color: "#8B5CF6",
        progress: 70,
      },
      conclusion: { label: "Wrapping Up", color: "#F59E0B", progress: 90 },
      end: { label: "Complete ✓", color: "#6B7280", progress: 100 },
    };
    return stages[stage] || stages.intro;
  };

  const stageInfo = getStageInfo(currentStage);

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
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-serif-bold text-xl text-ink">
                  AI Interview (Text)
                </h1>
                <p className="text-sm text-secondary">
                  Job ID: {JOB_ID} | User: {USER_ID.slice(0, 8)}...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Stage Badge */}
              <div className="flex items-center gap-2">
                {/* Message Count */}
                <span className="text-sm text-gray-500">
                  {Math.floor(messages.length / 2)}/15 turns
                </span>

                {/* Stage Badge */}
                <div
                  className="px-4 py-2 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: stageInfo.color }}
                >
                  {stageInfo.label}
                </div>
              </div>

              {/* Reset Button */}
              {isConnected && (
                <button
                  onClick={resetInterview}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Reset Interview"
                >
                  <RotateCcw className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {isConnected && (
            <div className="h-1 bg-gray-200 w-full">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{
                  width: `${stageInfo.progress}%`,
                  backgroundColor: stageInfo.color,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Not Connected State */}
        {!isConnected && !isConnecting && (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: "#F0EFE9" }}
            >
              <Bot className="w-12 h-12" style={{ color: "#D95D39" }} />
            </div>
            <h2 className="text-2xl font-serif-bold text-ink mb-2">
              Ready to Practice?
            </h2>
            <p className="text-secondary mb-8 text-center max-w-md">
              Start a text-based interview session. The AI interviewer will ask
              you questions based on your profile and the job requirements.
            </p>
            <button
              onClick={startInterview}
              className="px-8 py-4 rounded-xl text-white font-medium flex items-center gap-3 transition-all hover:scale-105"
              style={{ backgroundColor: "#D95D39" }}
            >
              <Bot className="w-5 h-5" />
              Start Interview
            </button>
          </div>
        )}

        {/* Connecting State */}
        {isConnecting && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2
              className="w-12 h-12 animate-spin mb-4"
              style={{ color: "#D95D39" }}
            />
            <p className="text-secondary">Connecting to interviewer...</p>
          </div>
        )}

        {/* Connected State */}
        {isConnected && (
          <>
            {/* Messages */}
            <div
              className="flex-1 bg-white rounded-xl border p-6 overflow-y-auto mb-4"
              style={{
                borderColor: "#E5E0D8",
                minHeight: "400px",
                maxHeight: "500px",
              }}
            >
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-secondary">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Waiting for interviewer...
                </div>
              )}

              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor:
                          msg.role === "user" ? "#3B82F6" : "#D95D39",
                      }}
                    >
                      {msg.role === "user" ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-blue-50 text-blue-900"
                          : "bg-gray-50 text-gray-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Thinking indicator */}
                {isThinking && (
                  <div className="flex gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#D95D39" }}
                    >
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                        <span className="text-sm text-gray-500">
                          Thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Feedback Display */}
            {feedback && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">
                  Interview Complete!
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {feedback.score !== undefined && (
                    <div>
                      <span className="text-green-700">Score:</span>{" "}
                      <span className="font-medium">{feedback.score}/100</span>
                    </div>
                  )}
                  {feedback.verdict && (
                    <div>
                      <span className="text-green-700">Verdict:</span>{" "}
                      <span className="font-medium">{feedback.verdict}</span>
                    </div>
                  )}
                  {feedback.summary && (
                    <div className="col-span-2">
                      <span className="text-green-700">Summary:</span>{" "}
                      <span>{feedback.summary}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div
              className="bg-white rounded-xl border p-4 flex gap-3"
              style={{ borderColor: "#E5E0D8" }}
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                disabled={isThinking || currentStage === "end"}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                style={{ borderColor: "#E5E0D8" }}
              />
              <button
                onClick={sendMessage}
                disabled={
                  !inputMessage.trim() || isThinking || currentStage === "end"
                }
                className="px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: "#D95D39" }}
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
