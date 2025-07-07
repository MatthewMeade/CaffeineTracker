"use client";

import React, { useState } from "react";
import { type EntryApiResponse } from "~/types/api";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DailyTimelineProps {
  entries: EntryApiResponse[];
}

type TimeCategory = "morning" | "afternoon" | "evening";

interface GroupedEntries {
  morning: EntryApiResponse[];
  afternoon: EntryApiResponse[];
  evening: EntryApiResponse[];
}

export function DailyTimeline({ entries }: DailyTimelineProps) {
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  const getTimeCategory = (dateString: string): TimeCategory => {
    const date = new Date(dateString);
    const hour = date.getHours();
    
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  };

  const groupEntriesByTime = (): GroupedEntries => {
    const grouped: GroupedEntries = {
      morning: [],
      afternoon: [],
      evening: [],
    };

    entries.forEach((entry) => {
      const category = getTimeCategory(entry.consumed_at);
      grouped[category].push(entry);
    });

    return grouped;
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getDrinkIcon = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("coffee") || lowerName.includes("espresso")) return "☕";
    if (lowerName.includes("tea") || lowerName.includes("matcha")) return "🍵";
    if (lowerName.includes("energy")) return "⚡";
    if (lowerName.includes("chocolate")) return "🍫";
    if (lowerName.includes("soda") || lowerName.includes("cola")) return "🥤";
    return "☕"; // Default
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getMostRecentEntry = () => {
    if (entries.length === 0) return null;
    return entries.reduce((latest, entry) => 
      new Date(entry.consumed_at) > new Date(latest.consumed_at) ? entry : latest
    );
  };

  const groupedEntries = groupEntriesByTime();
  const hasEntries = entries.length > 0;

  if (!hasEntries) {
    return (
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <div className="p-8 text-center">
          <p className="text-gray-400">Add a drink to start tracking your timeline</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
      <div className="p-6 space-y-4">
        {/* Timeline Header with Collapse Toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-cyan-400">Today&apos;s Timeline</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
            className="text-gray-400 hover:text-cyan-400 p-2 flex items-center gap-2"
          >
            <span className="text-sm">{isTimelineExpanded ? "Collapse" : "Expand"}</span>
            {isTimelineExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Collapsed View */}
          {!isTimelineExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Current Time Indicator */}
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse" />
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium text-cyan-400">Now</span>
                  <span className="text-sm text-gray-400">{getCurrentTime()}</span>
                </div>
              </div>

              {/* Most Recent Entry Summary */}
              {getMostRecentEntry() && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-2xl">{getDrinkIcon(getMostRecentEntry()!.name)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">
                      {getMostRecentEntry()!.name} • {formatTime(getMostRecentEntry()!.consumed_at)}
                    </div>
                    <div className="text-sm text-gray-400">Last entry</div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-cyan-400/20 text-cyan-400 border-cyan-400/30 text-sm"
                  >
                    {getMostRecentEntry()!.caffeine_mg}mg
                  </Badge>
                </div>
              )}

              {/* Entry Count Summary */}
              <div className="text-sm text-gray-400 text-center">
                {entries.length} {entries.length === 1 ? "entry" : "entries"} today • Click expand to view all
              </div>
            </motion.div>
          )}

          {/* Expanded View */}
          <AnimatePresence>
            {isTimelineExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-8">
                  {(["morning", "afternoon", "evening"] as const).map((period) => {
                    const periodEntries = groupedEntries[period] ?? [];
                    if (periodEntries.length === 0) return null;

                    return (
                      <div key={period} className="space-y-4">
                        <h3 className="text-lg font-medium capitalize text-cyan-400">{period}</h3>

                        <div className="space-y-3">
                          <AnimatePresence>
                            {periodEntries.map((entry, index) => (
                              <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.1 }}
                                layout
                              >
                                <div className="flex items-center gap-4 group hover:bg-white/5 p-3 rounded-lg transition-colors">
                                  <div className="text-2xl">{getDrinkIcon(entry.name)}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-white truncate">
                                      {entry.name} • {formatTime(entry.consumed_at)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="secondary"
                                      className="bg-cyan-400/20 text-cyan-400 border-cyan-400/30 text-sm font-medium"
                                    >
                                      {entry.caffeine_mg}mg
                                    </Badge>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
} 