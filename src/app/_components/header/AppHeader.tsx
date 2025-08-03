"use client";

import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { User, LogOut, TrendingDown } from "lucide-react";

interface AppHeaderProps {
  onSignInClick: () => void;
}

const SignInButton = ({ onSignInClick }: { onSignInClick: () => void }) => {

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onSignInClick}
      className="text-gray-400 hover:text-cyan-400"
    >
      Sign In
    </Button>
  )
}

const UserMenu = () => {
  const { data: session } = useSession();

  return (<DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="sm" variant="ghost" className="text-gray-400 h-8 w-8 p-0">
        <User className="w-5 h-5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      className="bg-black/80 backdrop-blur-sm border border-white/10 text-white min-w-48"
    >
      <div className="px-3 py-2 border-b border-white/10">
        <p className="text-sm text-gray-400">Signed in as</p>
        <p className="text-sm font-medium text-cyan-400 truncate">
          {session?.user?.email ?? "User"}
        </p>
      </div>
      <DropdownMenuItem
        onClick={() => signOut()}
        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 cursor-pointer"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>)
}

export function AppHeader({ onSignInClick }: AppHeaderProps) {
  const { data: session } = useSession();
  const isGuest = session?.user?.isGuest;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-2 mb-8"
    >
      <div className="flex items-center justify-start gap-1 max-w-4xl mx-auto">
        <TrendingDown className="h-8 inline text-red-400" />
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-white bg-clip-text text-transparent">
          lesspresso
        </h1>
        <p className="text-gray-400 ml-2 pt-1">Track your daily caffeine</p>


        <div className="flex-1 flex justify-end items-center gap-2">
          {isGuest ? (
            <SignInButton onSignInClick={onSignInClick} />
          ) : (
            <UserMenu />
          )}
        </div>
      </div>

    </motion.div>
  );
} 