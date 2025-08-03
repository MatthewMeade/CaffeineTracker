"use client";

import React, { useState } from "react";
import { type EntryApiResponse } from "~/types/api";
import { motion } from "framer-motion";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { Edit3, Save, Trash2, X } from "lucide-react";
import { api } from "~/trpc/react";

interface TimelineItemProps {
  entry: EntryApiResponse;
  index: number;
}

export function TimelineItem({ entry, index }: TimelineItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(entry.name);
  const [editAmount, setEditAmount] = useState(entry.caffeine_mg.toString());

  // tRPC mutations
  const updateEntryMutation = api.entries.update.useMutation();
  const deleteEntryMutation = api.entries.delete.useMutation();
  const utils = api.useUtils();

  const getDrinkIcon = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("coffee") || lowerName.includes("espresso")) return "☕";
    if (lowerName.includes("tea") || lowerName.includes("matcha")) return "🍵";
    if (lowerName.includes("energy")) return "⚡";
    if (lowerName.includes("chocolate")) return "🍫";
    if (lowerName.includes("soda") || lowerName.includes("cola")) return "🥤";
    return "☕"; // Default
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleStartEdit = () => {
    setEditName(entry.name);
    setEditAmount(entry.caffeine_mg.toString());
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(entry.name);
    setEditAmount(entry.caffeine_mg.toString());
  };

  const handleSaveEdit = async () => {
    const amount = Number.parseInt(editAmount);
    if (!editName.trim() || !amount || amount <= 0) {
      return;
    }

    try {
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        name: editName.trim(),
        caffeineMg: amount,
      });

      // Invalidate queries to refresh the UI
      await utils.entries.getDaily.invalidate();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update entry:", error);
      // Reset form on error
      setEditName(entry.name);
      setEditAmount(entry.caffeine_mg.toString());
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEntryMutation.mutateAsync({
        id: entry.id,
      });

      // Invalidate queries to refresh the UI
      await utils.entries.getDaily.invalidate();
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ delay: index * 0.1 }}
        layout
      >
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm flex-1"
            placeholder="Drink name"
          />
          <Input
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm w-20"
            placeholder="mg"
            type="number"
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={updateEntryMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-400 text-black h-8 w-8 p-0"
            >
              <Save className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelEdit}
              className="text-gray-400 hover:text-white h-8 w-8 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
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
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleStartEdit}
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 h-7 w-7 p-0"
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit entry</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={deleteEntryMutation.isPending}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete entry</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 