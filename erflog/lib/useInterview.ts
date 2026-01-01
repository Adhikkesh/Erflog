"use client";

import { useState, useCallback } from "react";
import { interviewChat, getErrorMessage } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface InterviewState {
  sessionId: string;
  messages: Message[];
  stage: string;
  messageCount: number;
  isLoading: boolean;
  error: string | null;
}

export function useInterview(jobContext: string) {
  const [state, setState] = useState<InterviewState>({
    sessionId: `interview-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`,
    messages: [],
    stage: "Introduction",
    messageCount: 0,
    isLoading: false,
    error: null,
  });

  const startInterview = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await interviewChat(state.sessionId, jobContext, "");

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [assistantMessage],
        stage: response.stage,
        messageCount: response.message_count,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [state.sessionId, jobContext]);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return false;

      const userMsg: Message = {
        id: `msg-user-${Date.now()}`,
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        isLoading: true,
        error: null,
      }));

      try {
        const response = await interviewChat(
          state.sessionId,
          jobContext,
          userMessage
        );

        const assistantMessage: Message = {
          id: `msg-assistant-${Date.now()}`,
          role: "assistant",
          content: response.response,
          timestamp: new Date(),
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          stage: response.stage,
          messageCount: response.message_count,
          isLoading: false,
        }));

        return true;
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return false;
      }
    },
    [state.sessionId, jobContext]
  );

  const resetInterview = useCallback(() => {
    setState({
      sessionId: `interview-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      messages: [],
      stage: "Introduction",
      messageCount: 0,
      isLoading: false,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    startInterview,
    sendMessage,
    resetInterview,
    clearError,
  };
}
