"use client";;
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { useTRPC } from "~/trpc/trpc";

interface DrinkSuggestion {
  name: string;
  caffeineMg: number;
  icon?: string;
}

export function AddEntryForm({ suggestions }: { suggestions: DrinkSuggestion[] }) {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const [inputValue, setInputValue] = useState("");
  const [drinkName, setDrinkName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<DrinkSuggestion[]>([]);
  const queryClient = useQueryClient();

  const createEntryMutation = useMutation(trpc.entries.create.mutationOptions({
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: trpc.entries.getDaily.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.entries.getSuggestions.queryKey() });

      // Reset form
      setInputValue("");
      setDrinkName("");
      setShowNameInput(false);
      setShowSearchResults(false);
    },
  }));

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
        icon: drink.icon ?? "☕",
      });
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
          icon: "☕",
        });
      } catch (error) {
        console.error("Failed to add entry:", error);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 relative">
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
            <div className="overflow-hidden">
              <Input
                value={drinkName}
                onChange={(e) => setDrinkName(e.target.value)}
                placeholder="Name this drink?"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm w-32"
              />
            </div>
          )}
        </div>

        {/* Search Results Popup */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden z-50">
            {searchResults.map((drink) => (
              <div
                key={`${drink.name}-${drink.caffeineMg}`}
                className="p-3 cursor-pointer border-b border-white/5 last:border-b-0 flex items-center justify-between hover:bg-white/10 transition-colors duration-200"
                onClick={() => selectSearchResult(drink)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{drink.icon ?? "☕"}</span>
                  <span className="text-white">{drink.name}</span>
                </div>
                <span className="text-cyan-400 text-sm">{drink.caffeineMg}mg</span>
              </div>
            ))}
          </div>
        )}

        {/* Manual Add Button */}
        {showNameInput && (
          <div className="mt-2">
            <Button
              onClick={handleManualAdd}
              disabled={createEntryMutation.isPending}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              {createEntryMutation.isPending ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        )}
      </div>

      {/* Quick-Add Favorites Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {suggestions.slice(0, 6).map((drink) => (
          <div
            key={`${drink.name}-${drink.caffeineMg}`}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  className="bg-white/5 border-white/10 backdrop-blur-sm cursor-pointer hover:bg-white/10 transition-all duration-200 hover:border-cyan-400/50 hover:scale-105 active:scale-95"
                  onClick={() => handleQuickAdd(drink)}
                >
                  <div className="p-3 text-center space-y-1">
                    <div className="text-2xl">{drink.icon ?? "☕"}</div>
                    <div className="text-sm font-medium text-white">{drink.name}</div>
                    <div className="text-xs text-cyan-400">{drink.caffeineMg}mg</div>
                  </div>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to add {drink.name}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
} 