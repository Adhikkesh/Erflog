"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  initSession,
  uploadResume,
  generateStrategy,
  generateApplication,
  healthCheck,
  getErrorMessage,
} from "@/lib/api";
import type { UserProfile, StrategyJobMatch, Application } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

interface SessionState {
  sessionId: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // User profile from resume
  profile: UserProfile | null;

  // Strategy data
  strategyJobs: StrategyJobMatch[];

  // Application data
  application: Application | null;

  // API status
  isApiHealthy: boolean;
}

interface SessionContextType extends SessionState {
  // Actions
  initialize: () => Promise<string | null>;
  uploadUserResume: (
    file: File,
    overrideSessionId?: string
  ) => Promise<boolean>;
  runStrategy: (query?: string, forceRefresh?: boolean) => Promise<boolean>;
  runApplication: (
    jobDescription?: string,
    forceRefresh?: boolean
  ) => Promise<boolean>;
  clearError: () => void;
  resetSession: () => void;
  checkHealth: () => Promise<boolean>;
}

// ============================================================================
// Context
// ============================================================================

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  SESSION_ID: "erflog_session_id",
  PROFILE: "erflog_profile",
  STRATEGY_JOBS: "erflog_strategy_jobs",
  STRATEGY_TIMESTAMP: "erflog_strategy_timestamp",
  APPLICATION: "erflog_application",
  APPLICATION_TIMESTAMP: "erflog_application_timestamp",
} as const;

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// ============================================================================
// Provider
// ============================================================================

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    sessionId: null,
    isInitialized: false,
    isLoading: false,
    error: null,
    profile: null,
    strategyJobs: [],
    application: null,
    isApiHealthy: true,
  });

  // Load persisted session data on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
      const profile = localStorage.getItem(STORAGE_KEYS.PROFILE);
      const strategyJobs = localStorage.getItem(STORAGE_KEYS.STRATEGY_JOBS);
      const application = localStorage.getItem(STORAGE_KEYS.APPLICATION);

      setState((prev) => ({
        ...prev,
        sessionId,
        isInitialized: !!sessionId,
        profile: profile ? JSON.parse(profile) : null,
        strategyJobs: strategyJobs ? JSON.parse(strategyJobs) : [],
        application: application ? JSON.parse(application) : null,
      }));
    }
  }, []);

  // Persist data helpers
  const persistData = (key: string, data: unknown) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  const persistString = (key: string, data: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, data);
    }
  };

  // Check if cached data is still valid (within CACHE_DURATION)
  const isCacheValid = (timestampKey: string): boolean => {
    if (typeof window === "undefined") return false;
    const timestamp = localStorage.getItem(timestampKey);
    if (!timestamp) return false;
    const cacheTime = parseInt(timestamp, 10);
    return Date.now() - cacheTime < CACHE_DURATION;
  };

  // Save timestamp for cache
  const persistTimestamp = (key: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, Date.now().toString());
    }
  };

  // ============================================================================
  // Actions
  // ============================================================================

  const checkHealth = async (): Promise<boolean> => {
    try {
      const response = await healthCheck();
      const isHealthy = response.status === "healthy";
      setState((prev) => ({ ...prev, isApiHealthy: isHealthy }));
      return isHealthy;
    } catch {
      setState((prev) => ({ ...prev, isApiHealthy: false }));
      return false;
    }
  };

  const initialize = async (): Promise<string | null> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await initSession();
      const sessionId = response.session_id;

      persistString(STORAGE_KEYS.SESSION_ID, sessionId);

      setState((prev) => ({
        ...prev,
        sessionId,
        isInitialized: true,
        isLoading: false,
      }));

      return sessionId;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return null;
    }
  };

  const uploadUserResume = async (
    file: File,
    overrideSessionId?: string
  ): Promise<boolean> => {
    const sessionIdToUse = overrideSessionId || state.sessionId;

    if (!sessionIdToUse) {
      setState((prev) => ({
        ...prev,
        error: "No active session. Please initialize first.",
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await uploadResume(file, sessionIdToUse);

      persistData(STORAGE_KEYS.PROFILE, response.profile);

      setState((prev) => ({
        ...prev,
        profile: response.profile,
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
  };

  const runStrategy = async (
    query?: string,
    forceRefresh = false
  ): Promise<boolean> => {
    // Check if we have valid cached data (unless force refresh)
    if (!forceRefresh && isCacheValid(STORAGE_KEYS.STRATEGY_TIMESTAMP)) {
      const cachedJobs =
        state.strategyJobs.length > 0
          ? state.strategyJobs
          : typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem(STORAGE_KEYS.STRATEGY_JOBS) || "[]")
          : [];

      if (cachedJobs.length > 0) {
        // Use cached data
        if (state.strategyJobs.length === 0) {
          setState((prev) => ({ ...prev, strategyJobs: cachedJobs }));
        }
        return true;
      }
    }

    // Build query from provided query or profile skills
    let queryText = query;

    if (!queryText) {
      // Get profile from state or localStorage
      const profileData =
        state.profile ||
        (typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILE) || "null")
          : null);

      if (profileData && profileData.skills && profileData.skills.length > 0) {
        // Use skills and experience summary as query
        queryText = profileData.skills.join(" ");
        if (profileData.experience_summary) {
          queryText += " " + profileData.experience_summary;
        }
      }
    }

    if (!queryText) {
      setState((prev) => ({
        ...prev,
        error: "No skills found. Please upload your resume first.",
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await generateStrategy(queryText);

      persistData(STORAGE_KEYS.STRATEGY_JOBS, response.strategy.matched_jobs);
      persistTimestamp(STORAGE_KEYS.STRATEGY_TIMESTAMP);

      setState((prev) => ({
        ...prev,
        strategyJobs: response.strategy.matched_jobs,
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
  };

  const runApplication = async (
    jobDescription?: string,
    forceRefresh = false
  ): Promise<boolean> => {
    // Check if we have valid cached data (unless force refresh)
    if (!forceRefresh && isCacheValid(STORAGE_KEYS.APPLICATION_TIMESTAMP)) {
      const cachedApp =
        state.application ||
        (typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATION) || "null")
          : null);

      if (cachedApp) {
        // Use cached data
        if (!state.application) {
          setState((prev) => ({ ...prev, application: cachedApp }));
        }
        return true;
      }
    }

    // Get sessionId from state or localStorage as fallback
    const sessionIdToUse =
      state.sessionId ||
      (typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEYS.SESSION_ID)
        : null);

    if (!sessionIdToUse) {
      setState((prev) => ({ ...prev, error: "No active session." }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await generateApplication(
        sessionIdToUse,
        jobDescription
      );

      persistData(STORAGE_KEYS.APPLICATION, response.application);
      persistTimestamp(STORAGE_KEYS.APPLICATION_TIMESTAMP);

      setState((prev) => ({
        ...prev,
        application: response.application,
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
  };

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  const resetSession = () => {
    // Clear all persisted data
    if (typeof window !== "undefined") {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
    }

    setState({
      sessionId: null,
      isInitialized: false,
      isLoading: false,
      error: null,
      profile: null,
      strategyJobs: [],
      application: null,
      isApiHealthy: true,
    });
  };

  const value: SessionContextType = {
    ...state,
    initialize,
    uploadUserResume,
    runStrategy,
    runApplication,
    clearError,
    resetSession,
    checkHealth,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
