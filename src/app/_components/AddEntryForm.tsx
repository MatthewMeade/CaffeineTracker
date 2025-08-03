"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";

interface DrinkSuggestion {
  name: string;
  caffeineMg: number;
}

const DRINK_ICONS: Record<string, string> = {
  "Espresso": "☕",
  "Coffee": "☕",
  "Green Tea": "🍵",
  "Black Tea": "🫖",
  "Energy Drink": "🥤",
  "Cola": "🥤",
  "Matcha": "🍃",
  "Latte": "☕",
  "Cappuccino": "☕",
  "Americano": "☕",
  "Mocha": "☕",
  "Hot Chocolate": "🍫",
  "Dark Chocolate": "🍫",
  "Caffeine Pill": "💊",
  "Ice Coffee": "🧊",
  "Red Bull": "⚡",
  "Monster": "🔥",
  "Tea": "🍵",
  "Herbal Tea": "💚",
  "Green Coffee": "🟢",
  "Blue Coffee": "🔵",
  "Purple Tea": "🟣",
  "Yellow Energy": "🟡",
  "Orange Boost": "🟠",
  "Red Alert": "🔴",
};

const getDrinkIcon = (name: string): string => {
  return DRINK_ICONS[name] ?? "☕";
};

export function AddEntryForm() {
  const { data: session } = useSession();
  const [inputValue, setInputValue] = useState("");
  const [drinkName, setDrinkName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<DrinkSuggestion[]>([]);

  // tRPC hooks - must be called before any early returns
  const { data: suggestions = [] } = api.entries.getSuggestions.useQuery();
  const createEntryMutation = api.entries.create.useMutation();
  const utils = api.useUtils();

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSearchResults(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Only render for users with a session
  if (!session?.user?.id) {
    return null;
  }

  // Handle search input changes
  const handleSearch = (query: string) => {
    setInputValue(query);
    
    if (query.trim()) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.name.toLowerCase().includes(query.toLowerCase()) ||
        suggestion.caffeineMg.toString().includes(query)
      );
      setSearchResults(filtered);
      setShowSearchResults(filtered.length > 0);
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }

    // Check if input is a valid number for manual entry
    const amount = Number.parseInt(query);
    setShowNameInput(amount > 0 && !isNaN(amount) && !showSearchResults);
  };

  // Handle search result selection
  const selectSearchResult = (drink: DrinkSuggestion) => {
    setInputValue(drink.caffeineMg.toString());
    setDrinkName(drink.name);
    setShowSearchResults(false);
    setShowNameInput(true);
  };

  // Handle quick add from favorites
  const handleQuickAdd = async (drink: DrinkSuggestion) => {
    try {
      await createEntryMutation.mutateAsync({
        name: drink.name,
        caffeineMg: drink.caffeineMg,
        consumedAt: new Date().toISOString(),
      });
      
      // Invalidate queries to refresh the UI
      await utils.entries.getDaily.invalidate();
      await utils.entries.getSuggestions.invalidate();
      
      // Reset form
      setInputValue("");
      setDrinkName("");
      setShowNameInput(false);
      setShowSearchResults(false);
    } catch (error) {
      console.error("Failed to add entry:", error);
    }
  };

  // Handle manual add
  const handleManualAdd = async () => {
    const amount = Number.parseInt(inputValue);
    if (amount > 0 && !isNaN(amount) && drinkName.trim()) {
      try {
        await createEntryMutation.mutateAsync({
          name: drinkName.trim(),
          caffeineMg: amount,
          consumedAt: new Date().toISOString(),
        });
        
        // Invalidate queries to refresh the UI
        await utils.entries.getDaily.invalidate();
        await utils.entries.getSuggestions.invalidate();
        
        // Reset form
        setInputValue("");
        setDrinkName("");
        setShowNameInput(false);
        setShowSearchResults(false);
      } catch (error) {
        console.error("Failed to add entry:", error);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="max-w-4xl mx-auto space-y-4 relative"
    >
      {/* Search Input Section */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={inputValue}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search drinks or enter amount (mg)"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          {showNameInput && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              className="overflow-hidden"
            >
              <Input
                value={drinkName}
                onChange={(e) => setDrinkName(e.target.value)}
                placeholder="Name this drink?"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm w-32"
              />
            </motion.div>
          )}
        </div>

        {/* Search Results Popup */}
        <AnimatePresence>
          {showSearchResults && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden z-50"
            >
              {searchResults.map((drink) => (
                <motion.div
                  key={`${drink.name}-${drink.caffeineMg}`}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                  className="p-3 cursor-pointer border-b border-white/5 last:border-b-0 flex items-center justify-between"
                  onClick={() => selectSearchResult(drink)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getDrinkIcon(drink.name)}</span>
                    <span className="text-white">{drink.name}</span>
                  </div>
                  <span className="text-cyan-400 text-sm">{drink.caffeineMg}mg</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual Add Button */}
        {showNameInput && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mt-2"
          >
            <Button
              onClick={handleManualAdd}
              disabled={createEntryMutation.isPending}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              {createEntryMutation.isPending ? "Adding..." : "Add Entry"}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Quick-Add Favorites Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {suggestions.slice(0, 6).map((drink, index) => (
          <motion.div
            key={`${drink.name}-${drink.caffeineMg}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  className="bg-white/5 border-white/10 backdrop-blur-sm cursor-pointer hover:bg-white/10 transition-all duration-200 hover:border-cyan-400/50"
                  onClick={() => handleQuickAdd(drink)}
                >
                  <div className="p-3 text-center space-y-1">
                    <div className="text-2xl">{getDrinkIcon(drink.name)}</div>
                    <div className="text-sm font-medium text-white">{drink.name}</div>
                    <div className="text-xs text-cyan-400">{drink.caffeineMg}mg</div>
                  </div>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to add {drink.name}</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
} 