"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthStep = "initial" | "confirmation";

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>("initial");
  const [error, setError] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendMagicLink = async () => {
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/",
      });

      if (result?.error) {
        setError(`Error sending email: ${result.error}`);
      } else {
        setStep("confirmation");
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError("");
    setStep("initial");
    setIsLoading(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step === "initial") {
      void handleSendMagicLink();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center lg:items-end lg:justify-end p-4 lg:p-8"
          onClick={handleClose}
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
            {step === "initial" ? (
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
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter your email"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm"
                      disabled={isLoading}
                    />
                    {error && (
                      <p className="text-sm text-red-400">{error}</p>
                    )}
                  </div>

                  <Button
                    onClick={handleSendMagicLink}
                    disabled={!email || isLoading || !validateEmail(email)}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {isLoading ? "Sending..." : "Send Magic Link"}
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
                      Sent to: <span className="text-cyan-400">{email}</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setStep("initial")}
                    className="flex-1 text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleClose}
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
  );
} 