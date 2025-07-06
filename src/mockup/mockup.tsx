"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AnimatePresence, motion } from "framer-motion"
import {
    Calendar,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Edit3,
    Heart,
    LogOut,
    Mail,
    Plus,
    Save,
    Search,
    Settings,
    Trash2,
    User,
    X,
} from "lucide-react"
import { useState } from "react"
import { Bar, BarChart, Tooltip as ChartTooltip, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts"

interface CaffeineEntry {
  id: string
  name: string
  amount: number
  time: Date
  category: "morning" | "afternoon" | "evening"
}

interface Favorite {
  id: string
  name: string
  amount: number
  icon: string
}

interface HistoricalEntry {
  id: string
  name: string
  amount: number
  time: string
  category: "morning" | "afternoon" | "evening"
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

const DEFAULT_FAVORITES: Favorite[] = [
  { id: "1", name: "Espresso", amount: 63, icon: "☕" },
  { id: "2", name: "Coffee", amount: 95, icon: "☕" },
  { id: "3", name: "Green Tea", amount: 25, icon: "🍵" },
  { id: "4", name: "Energy Drink", amount: 80, icon: "🥤" },
  { id: "5", name: "Black Tea", amount: 47, icon: "🫖" },
  { id: "6", name: "Matcha", amount: 70, icon: "🍃" },
]

// Mock historical data with detailed entries
const HISTORICAL_DATA = [
  {
    date: "Mon",
    amount: 320,
    drinks: ["Coffee", "Green Tea"],
    entries: [
      { id: "mon1", name: "Morning Coffee", amount: 95, time: "8:30 AM", category: "morning" as const },
      { id: "mon2", name: "Afternoon Tea", amount: 47, time: "2:15 PM", category: "afternoon" as const },
      { id: "mon3", name: "Green Tea", amount: 25, time: "4:45 PM", category: "afternoon" as const },
      { id: "mon4", name: "Espresso", amount: 63, time: "7:20 PM", category: "evening" as const },
      { id: "mon5", name: "Dark Chocolate", amount: 12, time: "9:15 PM", category: "evening" as const },
    ],
  },
  {
    date: "Tue",
    amount: 450,
    drinks: ["Espresso", "Energy Drink", "Coffee"],
    entries: [
      { id: "tue1", name: "Espresso", amount: 63, time: "7:45 AM", category: "morning" as const },
      { id: "tue2", name: "Coffee", amount: 95, time: "9:30 AM", category: "morning" as const },
      { id: "tue3", name: "Energy Drink", amount: 80, time: "1:20 PM", category: "afternoon" as const },
      { id: "tue4", name: "Coffee", amount: 95, time: "3:30 PM", category: "afternoon" as const },
      { id: "tue5", name: "Green Tea", amount: 25, time: "5:45 PM", category: "afternoon" as const },
      { id: "tue6", name: "Dark Chocolate", amount: 43, time: "8:15 PM", category: "evening" as const },
    ],
  },
  {
    date: "Wed",
    amount: 280,
    drinks: ["Latte", "Green Tea"],
    entries: [
      { id: "wed1", name: "Latte", amount: 173, time: "9:00 AM", category: "morning" as const },
      { id: "wed2", name: "Green Tea", amount: 25, time: "3:30 PM", category: "afternoon" as const },
      { id: "wed3", name: "Matcha", amount: 70, time: "6:15 PM", category: "evening" as const },
    ],
  },
  {
    date: "Thu",
    amount: 380,
    drinks: ["Coffee", "Black Tea", "Matcha"],
    entries: [
      { id: "thu1", name: "Coffee", amount: 95, time: "8:15 AM", category: "morning" as const },
      { id: "thu2", name: "Black Tea", amount: 47, time: "11:30 AM", category: "morning" as const },
      { id: "thu3", name: "Energy Drink", amount: 80, time: "2:45 PM", category: "afternoon" as const },
      { id: "thu4", name: "Matcha", amount: 70, time: "4:20 PM", category: "afternoon" as const },
      { id: "thu5", name: "Espresso", amount: 63, time: "7:30 PM", category: "evening" as const },
    ],
  },
  {
    date: "Fri",
    amount: 520,
    drinks: ["Energy Drink", "Coffee", "Espresso"],
    entries: [
      { id: "fri1", name: "Coffee", amount: 95, time: "7:30 AM", category: "morning" as const },
      { id: "fri2", name: "Energy Drink", amount: 80, time: "10:15 AM", category: "morning" as const },
      { id: "fri3", name: "Coffee", amount: 95, time: "1:45 PM", category: "afternoon" as const },
      { id: "fri4", name: "Espresso", amount: 63, time: "3:20 PM", category: "afternoon" as const },
      { id: "fri5", name: "Energy Drink", amount: 80, time: "5:30 PM", category: "afternoon" as const },
      { id: "fri6", name: "Dark Chocolate", amount: 12, time: "8:45 PM", category: "evening" as const },
    ],
  },
  {
    date: "Sat",
    amount: 150,
    drinks: ["Green Tea"],
    entries: [
      { id: "sat1", name: "Green Tea", amount: 25, time: "10:30 AM", category: "morning" as const },
      { id: "sat2", name: "Matcha", amount: 70, time: "2:15 PM", category: "afternoon" as const },
      { id: "sat3", name: "Green Tea", amount: 25, time: "4:45 PM", category: "afternoon" as const },
    ],
  },
  {
    date: "Sun",
    amount: 240,
    drinks: ["Coffee", "Tea"],
    entries: [
      { id: "sun1", name: "Coffee", amount: 95, time: "9:15 AM", category: "morning" as const },
      { id: "sun2", name: "Black Tea", amount: 47, time: "1:30 PM", category: "afternoon" as const },
      { id: "sun3", name: "Green Tea", amount: 25, time: "4:20 PM", category: "afternoon" as const },
      { id: "sun4", name: "Dark Chocolate", amount: 12, time: "7:45 PM", category: "evening" as const },
    ],
  },
]

export default function CaffeineTracker() {
  const [entries, setEntries] = useState<CaffeineEntry[]>([
    {
      id: "default-1",
      name: "Morning Coffee",
      amount: 95,
      time: new Date(new Date().setHours(8, 30, 0, 0)),
      category: "morning",
    },
    {
      id: "default-2",
      name: "Green Tea",
      amount: 25,
      time: new Date(new Date().setHours(10, 15, 0, 0)),
      category: "morning",
    },
    {
      id: "default-3",
      name: "Energy Drink",
      amount: 80,
      time: new Date(new Date().setHours(14, 20, 0, 0)),
      category: "afternoon",
    },
    {
      id: "default-4",
      name: "Espresso",
      amount: 63,
      time: new Date(new Date().setHours(16, 45, 0, 0)),
      category: "afternoon",
    },
    {
      id: "default-5",
      name: "Dark Chocolate",
      amount: 12,
      time: new Date(new Date().setHours(20, 30, 0, 0)),
      category: "evening",
    },
  ])
  const [favorites, setFavorites] = useState<Favorite[]>(DEFAULT_FAVORITES)
  const [dailyLimit, setDailyLimit] = useState(400)
  const [inputValue, setInputValue] = useState("")
  const [drinkName, setDrinkName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState<"7D" | "30D" | "Custom">("7D")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [searchResults, setSearchResults] = useState<Favorite[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showFavoritesManager, setShowFavoritesManager] = useState(false)
  const [editingDrink, setEditingDrink] = useState<Favorite | null>(null)
  const [newDrinkName, setNewDrinkName] = useState("")
  const [newDrinkAmount, setNewDrinkAmount] = useState("")
  const [newDrinkIcon, setNewDrinkIcon] = useState("☕")
  const [tempLimit, setTempLimit] = useState(dailyLimit.toString())
  const [showSettings, setShowSettings] = useState(false)

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authEmail, setAuthEmail] = useState("")
  const [authStep, setAuthStep] = useState<"initial" | "confirmation">("initial")

  // State for collapsible timeline - starts collapsed
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false)

  // Historical overview states
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [editingHistoricalEntry, setEditingHistoricalEntry] = useState<string | null>(null)
  const [editHistoricalName, setEditHistoricalName] = useState("")
  const [editHistoricalAmount, setEditHistoricalAmount] = useState("")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

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

  const handleQuickAdd = (drink: Favorite) => {
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
      groups[category] ??= []
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
      const results = favorites.filter((drink) => drink.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
      setSearchResults(results)
      setShowSearchResults(true)
    } else {
      setShowSearchResults(false)
    }
  }

  const selectSearchResult = (drink: Favorite) => {
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
    const rawData =
      selectedDateRange === "7D"
        ? HISTORICAL_DATA
        : [
            ...HISTORICAL_DATA,
            { date: "Week 2", amount: 280, drinks: ["Coffee", "Tea"], entries: [] },
            { date: "Week 3", amount: 420, drinks: ["Energy Drink", "Coffee"], entries: [] },
            { date: "Week 4", amount: 350, drinks: ["Latte", "Matcha"], entries: [] },
          ]

    // Transform data for stacked bar chart
    return rawData.map((item) => ({
      ...item,
      withinLimit: Math.min(item.amount, dailyLimit),
      overage: Math.max(0, item.amount - dailyLimit),
    }))
  }

  const getSelectedDayEntries = (day: string) => {
    const dayData = HISTORICAL_DATA.find((d) => d.date === day)
    return dayData?.entries ?? []
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
      const newDrink: Favorite = {
        id: Date.now().toString(),
        name: newDrinkName,
        amount,
        icon: newDrinkIcon,
      }
      setFavorites((prev) => [...prev, newDrink])
      setNewDrinkName("")
      setNewDrinkAmount("")
      setNewDrinkIcon("☕")
    }
  }

  const updateDrink = (drink: Favorite) => {
    setFavorites((prev) => prev.map((d) => (d.id === drink.id ? drink : d)))
    setEditingDrink(null)
  }

  const deleteDrink = (id: string) => {
    setFavorites((prev) => prev.filter((d) => d.id !== id))
  }

  interface TooltipProps {
    active?: boolean
    payload?: Array<{
      payload: {
        withinLimit: number
        overage: number
        drinks: string[]
      }
    }>
    label?: string
  }

  interface ChartClickData {
    activeLabel?: string
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload?.length) {
      const data = payload[0]?.payload
      if (!data) return null
      const totalAmount = data.withinLimit + data.overage
      return (
        <div className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-lg">
          <p className="text-cyan-400 font-medium">{label}</p>
          <p className="text-white">{`${totalAmount}mg caffeine`}</p>
          {data.overage > 0 && <p className="text-red-400 text-sm">{`+${data.overage}mg over limit`}</p>}
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

  const handleSendMagicLink = async () => {
    if (authEmail?.includes("@")) {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setAuthStep("confirmation")

      // Simulate successful authentication after 3 seconds
      setTimeout(() => {
        setIsAuthenticated(true)
        setUserEmail(authEmail)
        setShowAuthModal(false)
        setAuthStep("initial")
        setAuthEmail("")
      }, 3000)
    }
  }

  const handleSignOut = () => {
    setIsAuthenticated(false)
    setUserEmail("")
  }

  const resetAuthModal = () => {
    setAuthStep("initial")
    setAuthEmail("")
  }

  // Get the most recent entry for collapsed timeline view
  const getMostRecentEntry = () => {
    if (entries.length === 0) return null
    return entries.reduce((latest, entry) => (entry.time > latest.time ? entry : latest))
  }

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getDrinkIcon = (name: string): string => {
    const iconMap: Record<string, string> = {
      "Morning Coffee": "☕",
      Coffee: "☕",
      Espresso: "☕",
      Latte: "☕",
      "Green Tea": "🍵",
      "Black Tea": "🫖",
      "Afternoon Tea": "🫖",
      "Energy Drink": "🥤",
      Matcha: "🍃",
      "Dark Chocolate": "🍫",
    }
    return iconMap[name] ?? "☕"
  }

  const navigateWeek = (direction: "prev" | "next") => {
    if (selectedDateRange === "7D") {
      setCurrentWeekOffset((prev) => (direction === "prev" ? prev - 1 : prev + 1))
    } else if (selectedDateRange === "30D") {
      setCurrentWeekOffset((prev) => (direction === "prev" ? prev - 4 : prev + 4))
    }
  }

  const getDateRangeLabel = () => {
    if (selectedDateRange === "Custom") {
      return customStartDate && customEndDate ? `${customStartDate} - ${customEndDate}` : "Select Date Range"
    }

    const today = new Date()
    const offset = currentWeekOffset * (selectedDateRange === "7D" ? 7 : 30)
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - offset - (selectedDateRange === "7D" ? 6 : 29))
    const endDate = new Date(today)
    endDate.setDate(today.getDate() - offset)

    return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
  }

  const startHistoricalEdit = (entry: HistoricalEntry) => {
    setEditingHistoricalEntry(entry.id)
    setEditHistoricalName(entry.name)
    setEditHistoricalAmount(entry.amount.toString())
  }

  const saveHistoricalEdit = () => {
    // In a real app, this would update the historical data
    setEditingHistoricalEntry(null)
    setEditHistoricalName("")
    setEditHistoricalAmount("")
  }

  const cancelHistoricalEdit = () => {
    setEditingHistoricalEntry(null)
    setEditHistoricalName("")
    setEditHistoricalAmount("")
  }

  const deleteHistoricalEntry = (entryId: string) => {
    // In a real app, this would delete from historical data
    console.log("Delete historical entry:", entryId)
  }

  const addToFavorites = (name: string, amount: number) => {
    const newFavorite: Favorite = {
      id: Date.now().toString(),
      name,
      amount,
      icon: getDrinkIcon(name),
    }
    setFavorites((prev) => {
      // Check if already exists
      const exists = prev.some((fav) => fav.name === name && fav.amount === amount)
      if (exists) return prev
      return [...prev, newFavorite]
    })
    // Show some visual feedback here
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

        <div className="relative z-10 max-w-6xl mx-auto p-6">
          {/* HEADER */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2 mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Caffeine Flow
              </h1>
              <div className="flex-1 flex justify-end items-center gap-2">
                {isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-gray-400 hover:text-cyan-400 h-8 w-8 p-0">
                        <User className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-black/80 backdrop-blur-sm border border-white/10 text-white min-w-48"
                    >
                      <div className="px-3 py-2 border-b border-white/10">
                        <p className="text-sm text-gray-400">Signed in as</p>
                        <p className="text-sm font-medium text-cyan-400 truncate">{userEmail}</p>
                      </div>
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAuthModal(true)}
                    className="text-gray-400 hover:text-cyan-400"
                  >
                    Sign In
                  </Button>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowSettings(true)}
                      className="text-gray-400 hover:text-cyan-400"
                    >
                      <Settings className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <p className="text-gray-400 text-sm">Track your daily energy</p>
          </motion.div>

          {/* MAIN CONTENT - Single Column Layout */}
          <div className="space-y-8">
            {/* 1. CAFFEINE GAUGE - Centered */}
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
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={getGaugeColor()} stopOpacity="0.9" />
                          <stop offset="100%" stopColor={getGaugeColor()} stopOpacity="0.6" />
                        </linearGradient>
                        <clipPath id="circleClip">
                          <circle cx="50" cy="50" r="41" />
                        </clipPath>
                      </defs>

                      {/* Background circle */}
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />

                      {/* Wave/Fill Animation */}
                      <g clipPath="url(#circleClip)">
                        <motion.path
                          fill="url(#liquidGradient)"
                          animate={{
                            d: [
                              `M 0 ${100 - percentageOfLimit} C 20 ${95 - percentageOfLimit}, 40 ${95 - percentageOfLimit}, 50 ${100 - percentageOfLimit} S 70 ${105 - percentageOfLimit}, 100 ${100 - percentageOfLimit} V 100 H 0 Z`,
                              `M 0 ${100 - percentageOfLimit} C 20 ${105 - percentageOfLimit}, 40 ${105 - percentageOfLimit}, 50 ${100 - percentageOfLimit} S 70 ${95 - percentageOfLimit}, 100 ${100 - percentageOfLimit} V 100 H 0 Z`,
                              `M 0 ${100 - percentageOfLimit} C 20 ${95 - percentageOfLimit}, 40 ${95 - percentageOfLimit}, 50 ${100 - percentageOfLimit} S 70 ${105 - percentageOfLimit}, 100 ${100 - percentageOfLimit} V 100 H 0 Z`,
                            ],
                          }}
                          transition={{
                            duration: 3,
                            ease: "easeInOut",
                            repeat: Number.POSITIVE_INFINITY,
                          }}
                        />
                      </g>

                      {/* Outer ring */}
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke={getGaugeColor()}
                        strokeWidth="2"
                        opacity="0.3"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.div
                        key={getGaugeText().main}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center"
                        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}
                      >
                        <div className="text-2xl font-bold text-white">{getGaugeText().main}</div>
                        <div className="text-sm text-white opacity-80">{getGaugeText().sub}</div>
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

            {/* 2. INPUT SECTION - Centered */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="max-w-4xl mx-auto space-y-4 relative"
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

              {/* 3. DRINK SELECTION CHIPS - Centered Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {favorites.slice(0, 6).map((drink, index) => (
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
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowFavoritesManager(true)}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-medium"
              >
                Manage Favorites
              </Button>
            </motion.div>

            {/* 4. COLLAPSIBLE TODAY'S TIMELINE - Below Drink Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="max-w-4xl mx-auto"
            >
              {entries.length > 0 ? (
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
                                  {getMostRecentEntry()!.name} • {formatTime(getMostRecentEntry()!.time)}
                                </div>
                                <div className="text-sm text-gray-400">Last entry</div>
                              </div>
                              <Badge
                                variant="secondary"
                                className="bg-cyan-400/20 text-cyan-400 border-cyan-400/30 text-sm"
                              >
                                {getMostRecentEntry()!.amount}mg
                              </Badge>
                            </div>
                          )}

                          {/* Entry Count Summary */}
                          <div className="text-sm text-gray-400 text-center">
                            {entries.length} {entries.length === 1 ? "entry" : "entries"} today • Click expand to view
                            all
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
                              {["morning", "afternoon", "evening"].map((period) => {
                                const periodEntries = groupedEntries[period] ?? []
                                if (periodEntries.length === 0) return null

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
                                            {editingEntry === entry.id ? (
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
                                                    onClick={saveEdit}
                                                    className="bg-cyan-500 hover:bg-cyan-400 text-black h-8 w-8 p-0"
                                                  >
                                                    <Save className="w-3 h-3" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={cancelEdit}
                                                    className="text-gray-400 hover:text-white h-8 w-8 p-0"
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-4 group hover:bg-white/5 p-3 rounded-lg transition-colors">
                                                <div className="text-2xl">{getDrinkIcon(entry.name)}</div>
                                                <div className="flex-1 min-w-0">
                                                  <div className="font-medium text-white truncate">
                                                    {entry.name} • {formatTime(entry.time)}
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Badge
                                                    variant="secondary"
                                                    className="bg-cyan-400/20 text-cyan-400 border-cyan-400/30 text-sm font-medium"
                                                  >
                                                    {entry.amount}mg
                                                  </Badge>
                                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Button
                                                          size="sm"
                                                          variant="ghost"
                                                          onClick={() => startEdit(entry)}
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
                                                          onClick={() => deleteEntry(entry.id)}
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
                                            )}
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
                      </AnimatePresence>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <div className="p-8 text-center">
                    <p className="text-gray-400">Add a drink to start tracking your timeline</p>
                  </div>
                </Card>
              )}
            </motion.div>

            {/* 5. HISTORICAL OVERVIEW - Enhanced */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Historical Overview</h2>
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
                                  setSelectedDateRange(range)
                                  setCurrentWeekOffset(0)
                                  if (range !== "Custom") {
                                    setShowDatePicker(false)
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
                <div className="w-full h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getHistoricalData()}
                      margin={{ top: 5, right: 20, left: -10, bottom: 0 }}
                      onClick={(data: ChartClickData | undefined) => {
                        if (data?.activeLabel) {
                          setSelectedDay(data.activeLabel)
                        }
                      }}
                    >
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#9CA3AF", fontSize: 12 }}
                      />
                      <YAxis hide={true} />
                      <ChartTooltip content={<CustomTooltip />} />
                      <ReferenceLine y={dailyLimit} stroke="#FFD93D" strokeDasharray="4 4" strokeWidth={1} />
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
                    </BarChart>
                  </ResponsiveContainer>
                </div>

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

              {/* Selected Day Details with Edit/Delete */}
              <AnimatePresence>
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
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-8">
                        {["morning", "afternoon", "evening"].map((period) => {
                          const periodEntries = getSelectedDayEntries(selectedDay).filter(
                            (entry) => entry.category === period,
                          )
                          if (periodEntries.length === 0) return null

                          return (
                            <div key={period} className="space-y-4">
                              <h4 className="text-lg font-medium capitalize text-cyan-400">{period}</h4>

                              <div className="space-y-3">
                                {periodEntries.map((entry, index) => (
                                  <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                  >
                                    {editingHistoricalEntry === entry.id ? (
                                      <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                        <Input
                                          value={editHistoricalName}
                                          onChange={(e) => setEditHistoricalName(e.target.value)}
                                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm flex-1"
                                          placeholder="Drink name"
                                        />
                                        <Input
                                          value={editHistoricalAmount}
                                          onChange={(e) => setEditHistoricalAmount(e.target.value)}
                                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm w-20"
                                          placeholder="mg"
                                          type="number"
                                        />
                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            onClick={saveHistoricalEdit}
                                            className="bg-cyan-500 hover:bg-cyan-400 text-black h-8 w-8 p-0"
                                          >
                                            <Save className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={cancelHistoricalEdit}
                                            className="text-gray-400 hover:text-white h-8 w-8 p-0"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-4 group hover:bg-white/5 p-3 rounded-lg transition-colors">
                                        <div className="text-2xl">{getDrinkIcon(entry.name)}</div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-white truncate">
                                            {entry.name} • {entry.time}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge
                                            variant="secondary"
                                            className="bg-cyan-400/20 text-cyan-400 border-cyan-400/30 text-sm"
                                          >
                                            {entry.amount}mg
                                          </Badge>
                                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => startHistoricalEdit(entry)}
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
                                                  onClick={() => deleteHistoricalEntry(entry.id)}
                                                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7 p-0"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Delete entry</p>
                                              </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => addToFavorites(entry.name, entry.amount)}
                                                  className="text-gray-400 hover:text-cyan-300 hover:bg-cyan-400/10 h-7 w-7 p-0"
                                                >
                                                  <Heart className="w-3 h-3" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Add to Favorites</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Daily Limit Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="bg-[#1A1A1A] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">Daily Caffeine Limit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Daily Limit (mg)</label>
                <Input
                  value={tempLimit}
                  onChange={(e) => setTempLimit(e.target.value)}
                  type="number"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    saveDailyLimit()
                    setShowSettings(false)
                  }}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black"
                >
                  Save
                </Button>
                <Button variant="ghost" onClick={() => setShowSettings(false)} className="text-gray-400">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Full-Screen Manage Drinks Overlay */}
        <AnimatePresence>
          {showFavoritesManager && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowFavoritesManager(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1A1A1A] border border-white/10 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <h2 className="text-2xl font-bold text-cyan-400">Manage Favorites</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowFavoritesManager(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Two-Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                  {/* Left Column - Add New Drink */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Add New Favorite</h3>
                      <Card className="bg-white/5 border-white/10 p-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Favorite Name</label>
                            <Input
                              value={newDrinkName}
                              onChange={(e) => setNewDrinkName(e.target.value)}
                              placeholder="e.g., Morning Coffee"
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Caffeine Amount (mg)</label>
                            <Input
                              value={newDrinkAmount}
                              onChange={(e) => setNewDrinkAmount(e.target.value)}
                              placeholder="e.g., 95"
                              type="number"
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm h-12"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-300">Choose Icon</label>
                            <div className="grid grid-cols-6 gap-3">
                              {DRINK_ICONS.map((icon) => (
                                <button
                                  key={icon}
                                  onClick={() => setNewDrinkIcon(icon)}
                                  className={`p-3 rounded-lg text-2xl hover:bg-white/10 transition-colors ${
                                    newDrinkIcon === icon
                                      ? "bg-cyan-500/20 border-2 border-cyan-400"
                                      : "bg-white/5 border-2 border-transparent"
                                  }`}
                                >
                                  {icon}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Button
                            onClick={addNewDrink}
                            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black h-12 text-base font-medium"
                            disabled={!newDrinkName || !newDrinkAmount}
                          >
                            <Plus className="w-5 h-5 mr-2" />
                            Add Favorite
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* Right Column - Your Drinks */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Your Favorites ({favorites.length})</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {favorites.map((drink) => (
                          <Card
                            key={drink.id}
                            className="bg-white/5 border-white/10 backdrop-blur-sm group hover:bg-white/10 transition-all duration-200 relative"
                          >
                            {editingDrink?.id === drink.id ? (
                              <div className="p-4 space-y-3">
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
                                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm"
                                />
                                <div className="grid grid-cols-4 gap-2">
                                  {DRINK_ICONS.slice(0, 8).map((icon) => (
                                    <button
                                      key={icon}
                                      onClick={() => setEditingDrink({ ...editingDrink, icon })}
                                      className={`p-2 rounded text-lg hover:bg-white/10 transition-colors ${
                                        editingDrink.icon === icon
                                          ? "bg-cyan-500/20 border border-cyan-400"
                                          : "bg-white/5"
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
                                    className="bg-cyan-500 hover:bg-cyan-400 text-black flex-1"
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingDrink(null)}
                                    className="text-gray-400 flex-1"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 text-center space-y-2">
                                <div className="text-3xl">{drink.icon}</div>
                                <div className="font-medium text-white text-sm">{drink.name}</div>
                                <div className="text-xs text-cyan-400">{drink.amount}mg</div>

                                {/* Hover Actions */}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingDrink(drink)}
                                        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 h-6 w-6 p-0"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Edit favorite</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteDrink(drink.id)}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-6 w-6 p-0"
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
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Authentication Modal */}
        <AnimatePresence>
          {showAuthModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center lg:items-end lg:justify-end p-4 lg:p-8"
              onClick={() => {
                setShowAuthModal(false)
                resetAuthModal()
              }}
            >
              <motion.div
                initial={{
                  scale: 0.9,
                  opacity: 0,
                  y: window.innerWidth >= 1024 ? 20 : 0,
                  x: window.innerWidth >= 1024 ? 20 : 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  y: 0,
                  x: 0,
                }}
                exit={{
                  scale: 0.9,
                  opacity: 0,
                  y: window.innerWidth >= 1024 ? 20 : 0,
                  x: window.innerWidth >= 1024 ? 20 : 0,
                }}
                className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl w-full max-w-md lg:max-w-sm shadow-2xl"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {authStep === "initial" ? (
                  <div className="p-6 space-y-6">
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-cyan-400">Sign In or Sign Up</h2>
                      <p className="text-sm text-gray-400">
                        Enter your email to receive a magic link to sign in. No password required.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Input
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              void handleSendMagicLink()
                            }
                          }}
                        />
                      </div>

                      <Button
                        onClick={handleSendMagicLink}
                        disabled={!authEmail?.includes("@")}
                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Send Magic Link
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 space-y-6">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center">
                        <Mail className="w-8 h-8 text-cyan-400" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold text-cyan-400">Magic Link Sent!</h2>
                        <p className="text-sm text-gray-400">
                          Please check your email to continue. The link will expire in 15 minutes.
                        </p>
                        <p className="text-xs text-gray-500">
                          Sent to: <span className="text-cyan-400">{authEmail}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setAuthStep("initial")}
                        className="flex-1 text-gray-400 hover:text-white hover:bg-white/10"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAuthModal(false)
                          resetAuthModal()
                        }}
                        className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-medium"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  )
}
