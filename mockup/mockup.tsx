"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Search, Trash2, Edit3, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Tooltip as ChartTooltip,
} from "recharts"

interface CaffeineEntry {
  id: string
  name: string
  amount: number
  time: Date
  category: "morning" | "afternoon" | "evening"
}

interface SavedDrink {
  id: string
  name: string
  amount: number
  icon: string
}

const DRINK_ICONS = [
  "☕",
  "🍵",
  "🫖",
  "🥤",
  "🧃",
  "🍃",
  "🍫",
  "💊",
  "🧊",
  "⚡",
  "🔥",
  "💚",
  "🟢",
  "🔵",
  "🟣",
  "🟡",
  "🟠",
  "🔴",
]

const DEFAULT_DRINKS: SavedDrink[] = [
  { id: "1", name: "Espresso", amount: 63, icon: "☕" },
  { id: "2", name: "Coffee", amount: 95, icon: "☕" },
  { id: "3", name: "Green Tea", amount: 25, icon: "🍵" },
  { id: "4", name: "Energy Drink", amount: 80, icon: "🥤" },
  { id: "5", name: "Black Tea", amount: 47, icon: "🫖" },
  { id: "6", name: "Matcha", amount: 70, icon: "🍃" },
]

// Mock historical data
const HISTORICAL_DATA = [
  { date: "Mon", amount: 320, drinks: ["Coffee", "Green Tea"] },
  { date: "Tue", amount: 450, drinks: ["Espresso", "Energy Drink", "Coffee"] },
  { date: "Wed", amount: 280, drinks: ["Latte", "Green Tea"] },
  { date: "Thu", amount: 380, drinks: ["Coffee", "Black Tea", "Matcha"] },
  { date: "Fri", amount: 520, drinks: ["Energy Drink", "Coffee", "Espresso"] },
  { date: "Sat", amount: 150, drinks: ["Green Tea"] },
  { date: "Sun", amount: 240, drinks: ["Coffee", "Tea"] },
]

export default function CaffeineTracker() {
  const [entries, setEntries] = useState<CaffeineEntry[]>([])
  const [savedDrinks, setSavedDrinks] = useState<SavedDrink[]>(DEFAULT_DRINKS)
  const [dailyLimit, setDailyLimit] = useState(400)
  const [inputValue, setInputValue] = useState("")
  const [drinkName, setDrinkName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState<"7D" | "30D" | "Custom">("7D")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [searchResults, setSearchResults] = useState<SavedDrink[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showDrinkManager, setShowDrinkManager] = useState(false)
  const [editingDrink, setEditingDrink] = useState<SavedDrink | null>(null)
  const [newDrinkName, setNewDrinkName] = useState("")
  const [newDrinkAmount, setNewDrinkAmount] = useState("")
  const [newDrinkIcon, setNewDrinkIcon] = useState("☕")
  const [tempLimit, setTempLimit] = useState(dailyLimit.toString())
  const [showSettings, setShowSettings] = useState(false)

  const totalCaffeine = entries.reduce((sum, entry) => sum + entry.amount, 0)
  const percentageOfLimit = Math.min((totalCaffeine / dailyLimit) * 100, 100)
  const isOverLimit = totalCaffeine > dailyLimit

  const getTimeCategory = (date: Date): "morning" | "afternoon" | "evening" => {
    const hour = date.getHours()
    if (hour < 12) return "morning"
    if (hour < 18) return "afternoon"
    return "evening"
  }

  const addEntry = (name: string, amount: number) => {
    const newEntry: CaffeineEntry = {
      id: Date.now().toString(),
      name,
      amount,
      time: new Date(),
      category: getTimeCategory(new Date()),
    }
    setEntries((prev) => [...prev, newEntry])
    setInputValue("")
    setDrinkName("")
    setShowNameInput(false)
  }

  const handleQuickAdd = (drink: SavedDrink) => {
    addEntry(drink.name, drink.amount)
  }

  const handleManualAdd = () => {
    const amount = Number.parseInt(inputValue)
    if (amount && amount > 0) {
      const name = drinkName || `${amount}mg Caffeine`
      addEntry(name, amount)
    }
  }

  const deleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const groupedEntries = entries.reduce(
    (groups, entry) => {
      const category = entry.category
      if (!groups[category]) groups[category] = []
      groups[category].push(entry)
      return groups
    },
    {} as Record<string, CaffeineEntry[]>,
  )

  const getGaugeColor = () => {
    if (isOverLimit) return "#FF6B6B"
    if (percentageOfLimit > 75) return "#FFD93D"
    return "#00F5FF"
  }

  const getGaugeText = () => {
    if (isOverLimit) {
      return {
        main: "Limit Reached",
        sub: `+${totalCaffeine - dailyLimit}mg`,
      }
    }
    return {
      main: `${totalCaffeine}mg`,
      sub: `${dailyLimit - totalCaffeine}mg remaining`,
    }
  }

  const handleSearch = (query: string) => {
    setInputValue(query)
    if (query.length > 0) {
      const results = savedDrinks.filter((drink) => drink.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
      setSearchResults(results)
      setShowSearchResults(true)
    } else {
      setShowSearchResults(false)
    }
  }

  const selectSearchResult = (drink: SavedDrink) => {
    addEntry(drink.name, drink.amount)
    setShowSearchResults(false)
    setInputValue("")
  }

  const startEdit = (entry: CaffeineEntry) => {
    setEditingEntry(entry.id)
    setEditName(entry.name)
    setEditAmount(entry.amount.toString())
  }

  const saveEdit = () => {
    if (editingEntry && editName && editAmount) {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === editingEntry ? { ...entry, name: editName, amount: Number.parseInt(editAmount) } : entry,
        ),
      )
      setEditingEntry(null)
      setEditName("")
      setEditAmount("")
    }
  }

  const cancelEdit = () => {
    setEditingEntry(null)
    setEditName("")
    setEditAmount("")
  }

  const getHistoricalData = () => {
    if (selectedDateRange === "7D") {
      return HISTORICAL_DATA
    }
    return [
      ...HISTORICAL_DATA,
      { date: "Week 2", amount: 280, drinks: ["Coffee", "Tea"] },
      { date: "Week 3", amount: 420, drinks: ["Energy Drink", "Coffee"] },
      { date: "Week 4", amount: 350, drinks: ["Latte", "Matcha"] },
    ]
  }

  const getSelectedDayEntries = (day: string) => {
    const mockEntries = {
      Mon: [
        { name: "Morning Coffee", amount: 95, time: "08:30" },
        { name: "Afternoon Tea", amount: 47, time: "14:15" },
        { name: "Green Tea", amount: 25, time: "16:45" },
      ],
      Tue: [
        { name: "Espresso", amount: 63, time: "07:45" },
        { name: "Energy Drink", amount: 80, time: "13:20" },
        { name: "Coffee", amount: 95, time: "15:30" },
        { name: "Dark Chocolate", amount: 43, time: "19:15" },
      ],
      Wed: [
        { name: "Latte", amount: 173, time: "09:00" },
        { name: "Green Tea", amount: 25, time: "15:30" },
      ],
    }
    return mockEntries[day as keyof typeof mockEntries] || []
  }

  const saveDailyLimit = () => {
    const newLimit = Number.parseInt(tempLimit)
    if (newLimit > 0) {
      setDailyLimit(newLimit)
    }
  }

  const addNewDrink = () => {
    const amount = Number.parseInt(newDrinkAmount)
    if (newDrinkName && amount > 0) {
      const newDrink: SavedDrink = {
        id: Date.now().toString(),
        name: newDrinkName,
        amount,
        icon: newDrinkIcon,
      }
      setSavedDrinks((prev) => [...prev, newDrink])
      setNewDrinkName("")
      setNewDrinkAmount("")
      setNewDrinkIcon("☕")
    }
  }

  const updateDrink = (drink: SavedDrink) => {
    setSavedDrinks((prev) => prev.map((d) => (d.id === drink.id ? drink : d)))
    setEditingDrink(null)
  }

  const deleteDrink = (id: string) => {
    setSavedDrinks((prev) => prev.filter((d) => d.id !== id))
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-lg">
          <p className="text-cyan-400 font-medium">{label}</p>
          <p className="text-white">{`${data.amount}mg caffeine`}</p>
          <p className="text-gray-400 text-sm">Top drinks:</p>
          {data.drinks.slice(0, 2).map((drink: string, i: number) => (
            <p key={i} className="text-gray-300 text-xs">
              • {drink}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#1A1A1A] text-white relative overflow-hidden">
        {/* Minimal Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, rgba(0, 245, 255, 0.3) 2px, transparent 0)`,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-md mx-auto p-6 space-y-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
            <div className="flex items-center justify-center gap-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Caffeine Flow
              </h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDrinkManager(true)}
                    className="text-gray-400 hover:text-cyan-400"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Manage drinks & settings</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-gray-400 text-sm">Track your daily energy</p>
          </motion.div>

          {/* Hydro Gauge with Liquid Effect */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="relative w-48 h-48 cursor-pointer hover:scale-105 transition-transform duration-200"
                  onClick={() => setShowSettings(true)}
                >
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />

                    {/* Liquid fill with solid gradient */}
                    <defs>
                      <clipPath id="circleClip">
                        <circle cx="50" cy="50" r="41" />
                      </clipPath>
                      <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={getGaugeColor()} stopOpacity="0.9" />
                        <stop offset="100%" stopColor={getGaugeColor()} stopOpacity="0.6" />
                      </linearGradient>
                    </defs>

                    {/* Solid liquid fill */}
                    <motion.rect
                      x="9"
                      y={91 - (percentageOfLimit * 82) / 100}
                      width="82"
                      height={(percentageOfLimit * 82) / 100}
                      fill="url(#liquidGradient)"
                      clipPath="url(#circleClip)"
                      initial={{ height: 0, y: 91 }}
                      animate={{
                        height: (percentageOfLimit * 82) / 100,
                        y: 91 - (percentageOfLimit * 82) / 100,
                      }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />

                    {/* Single animated wave line on top */}
                    <motion.path
                      d={`M9,${91 - (percentageOfLimit * 82) / 100} Q20,${91 - (percentageOfLimit * 82) / 100 - 2} 30,${91 - (percentageOfLimit * 82) / 100} T50,${91 - (percentageOfLimit * 82) / 100} T70,${91 - (percentageOfLimit * 82) / 100} T91,${91 - (percentageOfLimit * 82) / 100}`}
                      fill="none"
                      stroke={getGaugeColor()}
                      strokeWidth="2"
                      clipPath="url(#circleClip)"
                      animate={{
                        d: [
                          `M9,${91 - (percentageOfLimit * 82) / 100} Q20,${91 - (percentageOfLimit * 82) / 100 - 2} 30,${91 - (percentageOfLimit * 82) / 100} T50,${91 - (percentageOfLimit * 82) / 100} T70,${91 - (percentageOfLimit * 82) / 100} T91,${91 - (percentageOfLimit * 82) / 100}`,
                          `M9,${91 - (percentageOfLimit * 82) / 100} Q20,${91 - (percentageOfLimit * 82) / 100 + 2} 30,${91 - (percentageOfLimit * 82) / 100} T50,${91 - (percentageOfLimit * 82) / 100} T70,${91 - (percentageOfLimit * 82) / 100} T91,${91 - (percentageOfLimit * 82) / 100}`,
                          `M9,${91 - (percentageOfLimit * 82) / 100} Q20,${91 - (percentageOfLimit * 82) / 100 - 2} 30,${91 - (percentageOfLimit * 82) / 100} T50,${91 - (percentageOfLimit * 82) / 100} T70,${91 - (percentageOfLimit * 82) / 100} T91,${91 - (percentageOfLimit * 82) / 100}`,
                        ],
                      }}
                      transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      style={{
                        filter: `drop-shadow(0 0 8px ${getGaugeColor()}60)`,
                      }}
                    />

                    {/* Outer ring */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={getGaugeColor()}
                      strokeWidth="2"
                      opacity="0.3"
                      style={{
                        filter: `drop-shadow(0 0 8px ${getGaugeColor()}40)`,
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.div
                      key={getGaugeText().main}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center"
                    >
                      <div className="text-2xl font-bold" style={{ color: getGaugeColor() }}>
                        {getGaugeText().main}
                      </div>
                      <div className="text-sm text-gray-400">{getGaugeText().sub}</div>
                    </motion.div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to adjust daily limit</p>
                <p>
                  Current: {totalCaffeine}mg ({Math.round(percentageOfLimit)}%)
                </p>
              </TooltipContent>
            </Tooltip>
          </motion.div>

          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 relative"
          >
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={inputValue}
                    onChange={(e) => {
                      const value = e.target.value
                      handleSearch(value)
                      const amount = Number.parseInt(value)
                      setShowNameInput(amount > 0 && !isNaN(amount) && !showSearchResults)
                    }}
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

              {/* Search Results */}
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
                        key={drink.id}
                        whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                        className="p-3 cursor-pointer border-b border-white/5 last:border-b-0 flex items-center justify-between"
                        onClick={() => selectSearchResult(drink)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{drink.icon}</span>
                          <span className="text-white">{drink.name}</span>
                        </div>
                        <span className="text-cyan-400 text-sm">{drink.amount}mg</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {showNameInput && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                  <Button
                    onClick={handleManualAdd}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-medium"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Entry
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Quick Select Chips */}
            <div className="grid grid-cols-2 gap-3">
              {savedDrinks.slice(0, 6).map((drink, index) => (
                <motion.div
                  key={drink.id}
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
                          <div className="text-2xl">{drink.icon}</div>
                          <div className="text-sm font-medium text-white">{drink.name}</div>
                          <div className="text-xs text-cyan-400">{drink.amount}mg</div>
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

          {/* Timeline */}
          {entries.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-semibold text-center">Today&apos;s Timeline</h2>

              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400/50 to-purple-400/50" />

                {["morning", "afternoon", "evening"].map((period) => {
                  const periodEntries = groupedEntries[period] || []
                  if (periodEntries.length === 0) return null

                  return (
                    <div key={period} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                        <h3 className="text-lg font-medium capitalize text-cyan-400">{period}</h3>
                      </div>

                      <div className="ml-6 space-y-2">
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
                              <Card className="bg-white/5 border-white/10 backdrop-blur-sm group hover:bg-white/10 transition-all duration-200">
                                {editingEntry === entry.id ? (
                                  <div className="p-3 space-y-3">
                                    <div className="flex gap-2">
                                      <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm"
                                        placeholder="Drink name"
                                      />
                                      <Input
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(e.target.value)}
                                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm w-20"
                                        placeholder="mg"
                                        type="number"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={saveEdit}
                                        className="bg-cyan-500 hover:bg-cyan-400 text-black"
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={cancelEdit}
                                        className="text-gray-400 hover:text-white"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3 flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-white">{entry.name}</div>
                                      <div className="text-sm text-gray-400">
                                        {entry.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="secondary"
                                        className="bg-cyan-400/20 text-cyan-400 border-cyan-400/30"
                                      >
                                        {entry.amount}mg
                                      </Badge>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => startEdit(entry)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
                                          >
                                            Edit
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
                                            onClick={() => deleteEntry(entry.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Delete entry</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>
                                )}
                              </Card>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Historical View */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-6 pt-8 border-t border-white/10"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Historical Overview</h2>
              <div className="flex gap-2">
                {(["7D", "30D", "Custom"] as const).map((range) => (
                  <Tooltip key={range}>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant={selectedDateRange === range ? "default" : "ghost"}
                        onClick={() => setSelectedDateRange(range)}
                        className={
                          selectedDateRange === range
                            ? "bg-cyan-500 text-black hover:bg-cyan-400"
                            : "text-gray-400 hover:text-white hover:bg-white/10"
                        }
                      >
                        {range}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View {range === "7D" ? "7 days" : range === "30D" ? "30 days" : "custom range"}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            <Card className="bg-white/5 border-white/10 backdrop-blur-sm p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={getHistoricalData()}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <YAxis hide />
                  <ReferenceLine y={dailyLimit} stroke="#FFD93D" strokeDasharray="4 4" strokeWidth={2} />
                  <ChartTooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} onClick={(data) => setSelectedDay(data.date)}>
                    {getHistoricalData().map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.amount > dailyLimit ? "#FF6B6B" : "#00F5FF"}
                        style={{
                          filter: `drop-shadow(0 0 8px ${entry.amount > dailyLimit ? "#FF6B6B40" : "#00F5FF40"})`,
                          cursor: "pointer",
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="flex justify-center gap-4 mt-4 text-xs">
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
            <AnimatePresence>
              {selectedDay && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-cyan-400">{selectedDay} Details</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedDay(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        ✕
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {getSelectedDayEntries(selectedDay).map((entry, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                        >
                          <div>
                            <div className="font-medium text-white text-sm">{entry.name}</div>
                            <div className="text-xs text-gray-400">{entry.time}</div>
                          </div>
                          <Badge variant="secondary" className="bg-cyan-400/20 text-cyan-400 border-cyan-400/30">
                            {entry.amount}mg
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Drink Manager Dialog */}
        <Dialog open={showDrinkManager} onOpenChange={setShowDrinkManager}>
          <DialogContent className="bg-[#1A1A1A] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">Drinks & Settings</DialogTitle>
            </DialogHeader>

            {/* Settings Section */}
            <Card className="bg-white/5 border-white/10 p-4 mb-4">
              <h3 className="text-sm font-medium text-cyan-400 mb-3">Daily Limit</h3>
              <div className="flex gap-2">
                <Input
                  value={tempLimit}
                  onChange={(e) => setTempLimit(e.target.value)}
                  type="number"
                  placeholder="Daily limit (mg)"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm"
                />
                <Button onClick={saveDailyLimit} className="bg-cyan-500 hover:bg-cyan-400 text-black">
                  Save
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Current limit: {dailyLimit}mg</p>
            </Card>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Add New Drink */}
              <Card className="bg-white/5 border-white/10 p-4">
                <h3 className="text-sm font-medium text-cyan-400 mb-3">Add New Drink</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newDrinkName}
                      onChange={(e) => setNewDrinkName(e.target.value)}
                      placeholder="Drink name"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm"
                    />
                    <Input
                      value={newDrinkAmount}
                      onChange={(e) => setNewDrinkAmount(e.target.value)}
                      placeholder="mg"
                      type="number"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm w-20"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Choose Icon</label>
                    <div className="grid grid-cols-9 gap-2">
                      {DRINK_ICONS.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => setNewDrinkIcon(icon)}
                          className={`p-2 rounded text-lg hover:bg-white/10 transition-colors ${
                            newDrinkIcon === icon ? "bg-cyan-500/20 border border-cyan-400" : "bg-white/5"
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={addNewDrink} className="w-full bg-cyan-500 hover:bg-cyan-400 text-black">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Drink
                  </Button>
                </div>
              </Card>

              {/* Existing Drinks */}
              <div className="space-y-2">
                {savedDrinks.map((drink) => (
                  <Card key={drink.id} className="bg-white/5 border-white/10 p-3">
                    {editingDrink?.id === drink.id ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            value={editingDrink.name}
                            onChange={(e) => setEditingDrink({ ...editingDrink, name: e.target.value })}
                            className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm"
                          />
                          <Input
                            value={editingDrink.amount.toString()}
                            onChange={(e) =>
                              setEditingDrink({ ...editingDrink, amount: Number.parseInt(e.target.value) || 0 })
                            }
                            type="number"
                            className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm w-20"
                          />
                        </div>
                        <div className="grid grid-cols-9 gap-1">
                          {DRINK_ICONS.map((icon) => (
                            <button
                              key={icon}
                              onClick={() => setEditingDrink({ ...editingDrink, icon })}
                              className={`p-1 rounded text-sm hover:bg-white/10 transition-colors ${
                                editingDrink.icon === icon ? "bg-cyan-500/20 border border-cyan-400" : "bg-white/5"
                              }`}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateDrink(editingDrink)}
                            className="bg-cyan-500 hover:bg-cyan-400 text-black"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingDrink(null)}
                            className="text-gray-400"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{drink.icon}</span>
                          <div>
                            <div className="font-medium text-white">{drink.name}</div>
                            <div className="text-sm text-cyan-400">{drink.amount}mg</div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingDrink(drink)}
                            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteDrink(drink.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
