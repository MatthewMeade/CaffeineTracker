"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { api } from "~/trpc/react";
import { TimelineItem } from "./TimelineItem";

interface HistoricalViewProps {
  dailyLimit: number;
}

interface ChartDataPoint {
  date: string;
  total_mg: number;
  limit_exceeded: boolean;
  limit_mg: number | null;
  withinLimit: number;
  overage: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  label?: string;
  dailyLimit: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, dailyLimit }) => {
  if (active && payload?.length) {
    const data = payload[0]?.payload;
    if (!data) return null;
    
    const totalAmount = data.withinLimit + data.overage;
    const isOverLimit = data.overage > 0;
    
    return (
      <div className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-lg">
        <p className="text-cyan-400 font-medium">{label}</p>
        <p className="text-white">{`${totalAmount}mg caffeine`}</p>
        {isOverLimit && (
          <p className="text-red-400 text-sm">{`+${data.overage}mg over limit`}</p>
        )}
        <p className="text-gray-400 text-sm">Limit: {dailyLimit}mg</p>
      </div>
    );
  }
  return null;
};

interface SelectedDayTimelineProps {
  selectedDate: string;
}

function SelectedDayTimeline({ selectedDate }: SelectedDayTimelineProps) {
  const {
    data: dailyData,
    isLoading,
    error,
  } = api.entries.getDaily.useQuery(
    { date: selectedDate },
    {
      enabled: Boolean(selectedDate),
    }
  );

  if (isLoading) {
    return (
      <div className="w-full h-40 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-cyan-400 rounded-full animate-bounce"></div>
          <div className="w-4 h-4 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
          <div className="w-4 h-4 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400">
        <p>Error loading day details</p>
      </div>
    );
  }

  if (!dailyData) {
    return (
      <div className="text-center text-gray-400">
        <p>No data available for this day</p>
      </div>
    );
  }

  // Use default limit of 400mg if no limit is set
  const effectiveLimit = dailyData.daily_limit_mg ?? 400;
  const isOverLimit = dailyData.daily_total_mg > effectiveLimit;

  return (
    <div className="space-y-4">
      {/* Day Summary */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
        <div className="space-y-1">
          <p className="text-sm text-gray-400">Total Caffeine</p>
          <p className="text-2xl font-bold text-white">{dailyData.daily_total_mg}mg</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm text-gray-400">Daily Limit</p>
          <p className={`text-lg font-medium ${isOverLimit ? 'text-red-400' : 'text-cyan-400'}`}>
            {effectiveLimit}mg
          </p>
          {isOverLimit && (
            <p className="text-xs text-red-400">
              +{dailyData.daily_total_mg - effectiveLimit}mg over limit
            </p>
          )}
        </div>
      </div>

      {/* Simplified Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-cyan-400">Timeline</h3>
        {dailyData.entries.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No entries for this day</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyData.entries.map((entry, index) => (
              <TimelineItem key={entry.id} entry={entry} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function HistoricalView({ dailyLimit }: HistoricalViewProps) {
  const [selectedDateRange, setSelectedDateRange] = useState<"7D" | "30D" | "Custom">("7D");
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Calculate date range based on selected range and offset
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    let start: Date;
    let end: Date;

    if (selectedDateRange === "Custom" && customStartDate && customEndDate) {
      start = new Date(customStartDate);
      end = new Date(customEndDate);
    } else {
      const days = selectedDateRange === "7D" ? 7 : 30;
      const offset = currentWeekOffset * days;
      
      end = new Date(today);
      end.setDate(today.getDate() - offset);
      
      start = new Date(end);
      start.setDate(end.getDate() - (days - 1));
    }

    return {
      startDate: start.toISOString().split('T')[0]!,
      endDate: end.toISOString().split('T')[0]!,
    };
  }, [selectedDateRange, currentWeekOffset, customStartDate, customEndDate]);

  // Fetch graph data
  const {
    data: graphData,
    isLoading,
    error,
    refetch,
  } = api.entries.getGraphData.useQuery(
    {
      start_date: startDate,
      end_date: endDate,
    },
    {
      enabled: Boolean(startDate && endDate),
    }
  );

  // Transform data for stacked bar chart
  const chartData = useMemo(() => {
    if (!graphData?.data) return [];

    return graphData.data.map((item) => ({
      ...item,
      withinLimit: Math.min(item.total_mg, dailyLimit),
      overage: Math.max(0, item.total_mg - dailyLimit),
    }));
  }, [graphData, dailyLimit]);

  const navigateWeek = (direction: "prev" | "next") => {
    if (selectedDateRange === "7D") {
      setCurrentWeekOffset((prev) => (direction === "prev" ? prev - 1 : prev + 1));
    } else if (selectedDateRange === "30D") {
      setCurrentWeekOffset((prev) => (direction === "prev" ? prev - 4 : prev + 4));
    }
  };

  const getDateRangeLabel = () => {
    if (selectedDateRange === "Custom") {
      return customStartDate && customEndDate ? `${customStartDate} - ${customEndDate}` : "Select Date Range";
    }

    const today = new Date();
    const offset = currentWeekOffset * (selectedDateRange === "7D" ? 7 : 30);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - offset - (selectedDateRange === "7D" ? 6 : 29));
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - offset);

    return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  const handleChartClick = (data: { activeLabel?: string }) => {
    if (data?.activeLabel) {
      setSelectedDay(data.activeLabel);
    }
  };

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm p-6">
          <div className="text-center">
            <p className="text-red-400">Error loading historical data</p>
            <Button
              onClick={() => void refetch()}
              className="mt-2 bg-cyan-500 hover:bg-cyan-400 text-black"
            >
              Retry
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Header with Navigation */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-cyan-400">Historical Overview</h2>
          <div className="flex items-center gap-2">
            {/* Navigation Buttons */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigateWeek("prev")}
              className="text-gray-400 hover:text-cyan-400 h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Date Range Picker */}
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-cyan-400 flex items-center gap-2 px-3"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{getDateRangeLabel()}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-black/80 backdrop-blur-sm border border-white/10 text-white">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-cyan-400">Select Date Range</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {(["7D", "30D", "Custom"] as const).map((range) => (
                        <Button
                          key={range}
                          size="sm"
                          variant={selectedDateRange === range ? "default" : "ghost"}
                          onClick={() => {
                            setSelectedDateRange(range);
                            setCurrentWeekOffset(0);
                            if (range !== "Custom") {
                              setShowDatePicker(false);
                            }
                          }}
                          className={
                            selectedDateRange === range
                              ? "bg-cyan-500 text-black hover:bg-cyan-400"
                              : "text-gray-400 hover:text-white hover:bg-white/10"
                          }
                        >
                          {range}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {selectedDateRange === "Custom" && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">Start Date</label>
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">End Date</label>
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setShowDatePicker(false)}
                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-black"
                      >
                        Apply Range
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigateWeek("next")}
              className="text-gray-400 hover:text-cyan-400 h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stacked Bar Chart */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm p-6">
          {isLoading ? (
            <div className="w-full h-40 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-cyan-400 rounded-full animate-bounce"></div>
                <div className="w-4 h-4 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-4 h-4 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
            </div>
          ) : (
            <div className="w-full h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: -10, bottom: 0 }}
                  onClick={handleChartClick}
                >
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  />
                  <YAxis hide={true} />
                  <ReferenceLine 
                    y={dailyLimit} 
                    stroke="#FFD93D" 
                    strokeDasharray="4 4" 
                    strokeWidth={1} 
                  />
                  <Bar
                    dataKey="withinLimit"
                    stackId="a"
                    fill="#00F5FF"
                    radius={[0, 0, 4, 4]}
                    style={{ cursor: "pointer" }}
                  />
                  <Bar
                    dataKey="overage"
                    stackId="a"
                    fill="#FF6B6B"
                    radius={[4, 4, 0, 0]}
                    style={{ cursor: "pointer" }}
                  />
                  <CustomTooltip dailyLimit={dailyLimit} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Legend */}
          <div className="flex justify-center gap-4 text-xs mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-cyan-400" />
              <span className="text-gray-400">Within Limit</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-400" />
              <span className="text-gray-400">Over Limit</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-yellow-400" />
              <span className="text-gray-400">Daily Limit</span>
            </div>
          </div>
        </Card>

        {/* Selected Day Details */}
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-cyan-400">{selectedDay} Details</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedDay(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </Button>
              </div>
              <SelectedDayTimeline selectedDate={selectedDay} />
            </Card>
          </motion.div>
        )}
      </motion.div>
    </TooltipProvider>
  );
} 