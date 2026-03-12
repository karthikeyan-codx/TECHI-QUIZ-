import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const TOTAL_TIME = 15

export default function Timer({ timeLeft, total = TOTAL_TIME, onEnd }) {
  const progress = timeLeft / total
  const circumference = 2 * Math.PI * 40  // radius = 40

  const color =
    timeLeft > 8 ? '#00d4ff' :
    timeLeft > 4 ? '#ffd60a' :
    '#ff375f'

  const glow =
    timeLeft > 8 ? 'rgba(0,212,255,0.6)' :
    timeLeft > 4 ? 'rgba(255,214,10,0.6)' :
    'rgba(255,55,95,0.8)'

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      {/* Pulsing glow when < 5 seconds */}
      {timeLeft <= 5 && timeLeft > 0 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ background: `radial-gradient(circle, ${glow}, transparent)` }}
        />
      )}

      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 90 90">
        {/* Background track */}
        <circle
          cx="45" cy="45" r="40"
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="5"
        />
        {/* Progress arc */}
        <motion.circle
          cx="45" cy="45" r="40"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          transition={{ duration: 0.5 }}
        />
      </svg>

      {/* Number */}
      <motion.span
        key={timeLeft}
        initial={{ scale: 1.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 font-orbitron font-black text-2xl"
        style={{ color, textShadow: `0 0 10px ${color}` }}
      >
        {timeLeft}
      </motion.span>
    </div>
  )
}
