"use client";

import React from "react";
import { motion } from "framer-motion";

interface CaffeineGaugeProps {
  totalCaffeine: number;
  dailyLimit: number;
}

export function CaffeineGauge({ totalCaffeine, dailyLimit }: CaffeineGaugeProps) {
  const percentageOfLimit = Math.min((totalCaffeine / dailyLimit) * 100, 100);
  const isOverLimit = totalCaffeine > dailyLimit;

  const getGaugeColor = () => {
    if (isOverLimit) return "#FF6B6B";
    if (percentageOfLimit > 75) return "#FFD93D";
    return "#00F5FF";
  };

  const getGaugeText = () => {
    if (isOverLimit) {
      return {
        main: "Limit Reached",
        sub: `+${totalCaffeine - dailyLimit}mg`,
      };
    }
    return {
      main: `${totalCaffeine}mg`,
      sub: `${dailyLimit - totalCaffeine}mg remaining`,
    };
  };

  const gaugeColor = getGaugeColor();
  const gaugeText = getGaugeText();

  return (
    <div className="relative w-48 h-48 cursor-pointer hover:scale-105 transition-transform duration-200">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={gaugeColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={gaugeColor} stopOpacity="0.6" />
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
          stroke={gaugeColor}
          strokeWidth="2"
          opacity="0.3"
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          key={gaugeText.main}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}
        >
          <div className="text-2xl font-bold text-white">{gaugeText.main}</div>
          <div className="text-sm text-white opacity-80">{gaugeText.sub}</div>
        </motion.div>
      </div>
    </div>
  );
} 