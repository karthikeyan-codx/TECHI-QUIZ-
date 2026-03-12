import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Confetti from 'react-confetti'
import { Trophy, Clock, CheckCircle } from 'lucide-react'

function formatTime(seconds) {
  const s = Math.round(Number(seconds) || 0)
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m ${rem.toString().padStart(2, '0')}s`
}

export default function ResultPage() {
  const navigate = useNavigate()
  const [showConfetti, setShowConfetti] = useState(true)

  const score = parseInt(localStorage.getItem('tq_score')) || 0
  const totalTime = parseFloat(localStorage.getItem('tq_total_time')) || 0
  const playerName = localStorage.getItem('tq_player_name') || 'Player'

  const percent = Math.round((score / 60) * 100)

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 6000)
    return () => clearTimeout(t)
  }, [])

  const getGrade = () => {
    if (score >= 50) return { label: 'Excellent!', color: '#ffd60a' }
    if (score >= 40) return { label: 'Great!', color: '#30d158' }
    if (score >= 30) return { label: 'Good', color: '#00d4ff' }
    if (score >= 20) return { label: 'Average', color: '#bf5af2' }
    return { label: 'Keep Practicing', color: '#ff375f' }
  }

  const grade = getGrade()

  return (
    <div className="min-h-screen bg-dark-900 bg-grid flex items-center justify-center px-4 relative overflow-hidden">
      {showConfetti && score >= 30 && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          colors={['#00d4ff', '#bf5af2', '#ffd60a', '#30d158', '#ff375f']}
          numberOfPieces={200}
          recycle={false}
        />
      )}

      {/* Background orbs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-5"
             style={{ background: 'radial-gradient(circle, #00d4ff, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-5"
             style={{ background: 'radial-gradient(circle, #bf5af2, transparent)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="glass-card p-10 w-full max-w-md text-center relative z-10"
      >
        {/* TQ Logo */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center font-orbitron font-black text-2xl text-dark-900 mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #00d4ff, #bf5af2)', boxShadow: '0 0 30px rgba(0,212,255,0.4)' }}
        >
          TQ
        </div>

        <h1 className="font-orbitron font-bold text-2xl text-white mb-1">Quiz Completed!</h1>
        <p className="text-white/40 font-poppins text-sm mb-7">Well done, {playerName}!</p>

        {/* Score ring */}
        <div className="relative w-40 h-40 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
            <motion.circle
              cx="70" cy="70" r="60"
              fill="none"
              stroke="url(#scoreGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 60}
              initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - percent / 100) }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#bf5af2" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="font-orbitron font-black text-4xl"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #bf5af2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {score}
            </motion.span>
            <span className="text-white/30 font-poppins text-xs">/60</span>
          </div>
        </div>

        {/* Grade badge */}
        <div
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-orbitron font-bold text-sm mb-6"
          style={{ background: `${grade.color}15`, border: `1px solid ${grade.color}40`, color: grade.color }}
        >
          <Trophy className="w-4 h-4" />
          {grade.label}
        </div>

        {/* Stats */}
        <div className="glass-card p-4 space-y-3 mb-6">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-white/40">
              <CheckCircle className="w-4 h-4" />
              <span className="font-poppins">Score</span>
            </div>
            <span className="font-orbitron font-bold text-neon-blue">{score} / 60</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-white/40">
              <Clock className="w-4 h-4" />
              <span className="font-poppins">Time Taken</span>
            </div>
            <span className="font-orbitron font-bold text-neon-purple">{formatTime(totalTime)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/40 font-poppins">Accuracy</span>
            <span className="font-orbitron font-bold text-white">{percent}%</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/40 font-poppins">Status</span>
            <span className="badge-finished">Submitted</span>
          </div>
        </div>

        <p className="text-white/20 font-poppins text-xs">
          Leaderboard is visible to the admin only.
        </p>
      </motion.div>
    </div>
  )
}
