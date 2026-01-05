"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import * as api from "@/lib/api";
import type { TodayDataItem } from "@/lib/api";
import {
  Trophy,
  Calendar,
  ExternalLink,
  DollarSign,
  MapPin,
  Loader2,
  Search,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

export default function HackathonsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [hackathons, setHackathons] = useState<TodayDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fetch hackathons on mount
  useEffect(() => {
    const fetchHackathons = async () => {
      if (!isAuthenticated) return;

      try {
        setIsLoading(true);
        const data = await api.getTodayHackathons();
        setHackathons(data.hackathons || []);
      } catch (err) {
        console.error("Failed to fetch hackathons:", err);
        setError("Failed to load hackathons. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else {
        fetchHackathons();
      }
    }
  }, [isAuthenticated, authLoading, router]);

  // Filter hackathons based on search
  const filteredHackathons = hackathons.filter((h) =>
    h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await api.refreshTodayData();
      const data = await api.getTodayHackathons();
      setHackathons(data.hackathons || []);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#D95D39] mx-auto mb-4" />
          <p className="text-gray-600">Loading hackathons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] py-8 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Trophy className="w-8 h-8 text-[#D95D39]" />
                Hackathons
              </h1>
              <p className="text-gray-600 mt-1">
                AI-matched hackathons based on your profile
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hackathons..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D95D39] focus:border-transparent"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* Hackathon Cards */}
        <div className="space-y-4">
          {filteredHackathons.length > 0 ? (
            filteredHackathons.map((hackathon, index) => (
              <motion.div
                key={hackathon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {hackathon.title}
                        </h3>
                        <p className="text-sm text-gray-500">{hackathon.company}</p>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {hackathon.summary || "No description available"}
                    </p>

                    <div className="flex flex-wrap gap-3 text-sm">
                      {hackathon.location && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <MapPin className="w-4 h-4" />
                          {hackathon.location}
                        </span>
                      )}
                      {hackathon.platform && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {hackathon.platform}
                        </span>
                      )}
                      {hackathon.source && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                          {hackathon.source}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 ml-4">
                    {/* Match Score */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#D95D39]">
                        {Math.round(hackathon.score * 100)}%
                      </div>
                      <div className="text-xs text-gray-500">Match</div>
                    </div>

                    {/* Apply Button */}
                    {hackathon.link && (
                      <a
                        href={hackathon.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-[#D95D39] text-white rounded-lg hover:bg-[#c54d2d] transition-colors"
                      >
                        View
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No hackathons found</p>
              <p className="text-sm text-gray-400">
                {searchQuery
                  ? "Try a different search term"
                  : "Check back later for new hackathon opportunities"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
