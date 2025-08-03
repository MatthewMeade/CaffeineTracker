"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { CaffeineGauge } from "./CaffeineGauge";
import { DailyTimeline } from "./DailyTimeline";
import { AddEntryForm } from "./AddEntryForm";
import { AppHeader } from "./AppHeader";
import { AuthModal } from "./AuthModal";

import { motion } from "framer-motion";
import { type DailyEntriesApiResponse, type DailyLimitApiResponse } from "~/types/api";

interface DailyViewProps {
  initialDailyData?: DailyEntriesApiResponse;
  initialLimitData?: DailyLimitApiResponse;
}

export function DailyView({ initialDailyData, initialLimitData }: DailyViewProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Use tRPC queries for real-time updates, but with initial data
  const {
    data: dailyData,
    isLoading: dailyLoading,
    error: dailyError,
  } = api.entries.getDaily.useQuery(
    {},
    {
      initialData: initialDailyData,
      staleTime: 30000, // Consider data fresh for 30 seconds
    }
  );

  const {
    data: limitData,
    isLoading: limitLoading,
    error: limitError,
  } = api.settings.getLimit.useQuery(
    undefined,
    {
      initialData: initialLimitData,
      staleTime: 30000, // Consider data fresh for 30 seconds
    }
  );

  const isLoading = (dailyLoading ?? false) || (limitLoading ?? false);
  const hasError = (dailyError ?? false) || (limitError ?? false);



  if (hasError) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, rgba(0, 245, 255, 0.3) 2px, transparent 0)`,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto p-6">
          <AppHeader onSignInClick={() => setIsAuthModalOpen(true)} />

          <div className="mx-auto mt-16 w-full max-w-lg rounded-lg bg-white/10 p-8 text-center backdrop-blur-sm border border-white/20">
            <h2 className="mb-4 text-2xl font-bold text-white">Error Loading Data</h2>
            <p className="mb-6 text-red-400">
              Error loading your data. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If we have initial data, show it immediately; otherwise show loading
  if (isLoading && !initialDailyData) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, rgba(0, 245, 255, 0.3) 2px, transparent 0)`,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto p-6">
          <AppHeader onSignInClick={() => setIsAuthModalOpen(true)} />

          <div className="mx-auto mt-16 w-full max-w-lg rounded-lg bg-white/10 p-8 text-center backdrop-blur-sm border border-white/20">
            <h2 className="mb-4 text-2xl font-bold text-white">Loading...</h2>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-4 h-4 bg-cyan-400 rounded-full animate-bounce"></div>
              <div className="w-4 h-4 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-4 h-4 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
            <p className="text-gray-300">Loading your daily data...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalCaffeine = dailyData?.daily_total_mg ?? 0;
  const dailyLimit = limitData && typeof limitData.current_limit_mg === "number"
    ? Number(limitData.current_limit_mg)
    : 400; // Default limit
  const entries = dailyData?.entries ?? [];

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(0, 245, 255, 0.3) 2px, transparent 0)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6">
        {/* Header */}
        <AppHeader onSignInClick={() => setIsAuthModalOpen(true)} />

        {/* Main Content */}
        <div className="space-y-8">
          {/* Caffeine Gauge - Centered */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <CaffeineGauge 
              totalCaffeine={totalCaffeine} 
              dailyLimit={dailyLimit} 
            />
          </motion.div>

          {/* Add Entry Form */}
          <AddEntryForm />

          {/* Daily Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <DailyTimeline entries={entries} />
          </motion.div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
} 