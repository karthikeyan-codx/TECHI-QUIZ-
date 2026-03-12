import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, CheckCircle, Users } from 'lucide-react'
import { createPlayerWebSocket } from '../utils/websocket'

export default function WaitingRoom() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('waiting')
  const [dots, setDots] = useState(0)
  const wsRef = useRef(null)
  const sendRef = useRef(null)

  const playerId = parseInt(localStorage.getItem('tq_player_id'))
  const playerName = localStorage.getItem('tq_player_name') || 'Player'
  const roomCode = localStorage.getItem('tq_room_code')

  useEffect(() => {
    if (!playerId || !roomCode) {
      navigate('/')
      return
    }

    const { ws, send } = createPlayerWebSocket(roomCode, playerId, {
      onMessage: (msg) => {
        if (msg.type === 'approved') {
          setStatus('approved')
        } else if (msg.type === 'quiz_start') {
          navigate('/quiz')
        } else if (msg.type === 'eliminated') {
          setStatus('eliminated')
        }
      },
      onClose: () => {
        // try to reconnect after a second
      },
    })

    wsRef.current = ws
    sendRef.current = send

    // Animate waiting dots
    const dotInterval = setInterval(() => setDots(d => (d + 1) % 4), 500)

    return () => {
      ws.close()
      clearInterval(dotInterval)
    }
  }, [])

  const waitingDots = '.'.repeat(dots)

  return (
    <div className="min-h-screen bg-dark-900 bg-grid flex items-center justify-center px-4">
      {/* Background orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full opacity-5 pointer-events-none"
           style={{ background: 'radial-gradient(circle, #00d4ff, transparent)' }} />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-5 pointer-events-none"
           style={{ background: 'radial-gradient(circle, #bf5af2, transparent)' }} />

      <AnimatePresence mode="wait">
        {status === 'waiting' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass-card p-10 w-full max-w-md text-center"
          >
            {/* Animated ring */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-transparent"
                style={{ borderTopColor: '#00d4ff', borderRightColor: 'rgba(0,212,255,0.2)' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-transparent"
                style={{ borderTopColor: '#bf5af2', borderLeftColor: 'rgba(191,90,242,0.2)' }}
                animate={{ rotate: -360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Clock className="w-8 h-8 text-neon-blue" />
              </div>
            </div>

            <h1 className="font-orbitron font-bold text-2xl text-white mb-2">
              Waiting for Admin
            </h1>
            <p className="text-white/40 font-poppins text-sm mb-8">
              Your request is pending approval{waitingDots}
            </p>

            {/* Player info pill */}
            <div className="glass-card p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/40 font-poppins">Name</span>
                <span className="text-white font-semibold">{playerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40 font-poppins">Room</span>
                <span className="text-neon-blue font-orbitron font-bold">{roomCode}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40 font-poppins">Status</span>
                <span className="badge-waiting">Waiting</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-white/30 text-xs font-poppins">
              <Users className="w-3.5 h-3.5" />
              <span>Admin will approve you shortly</span>
            </div>
          </motion.div>
        )}

        {status === 'approved' && (
          <motion.div
            key="approved"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-10 w-full max-w-md text-center"
            style={{ borderColor: 'rgba(48,209,88,0.3)', boxShadow: '0 0 30px rgba(48,209,88,0.2)' }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(48,209,88,0.1)', border: '2px solid rgba(48,209,88,0.4)' }}
            >
              <CheckCircle className="w-10 h-10 text-neon-green" />
            </motion.div>
            <h1 className="font-orbitron font-bold text-2xl text-neon-green mb-2">Approved!</h1>
            <p className="text-white/50 font-poppins text-sm">Waiting for admin to start the quiz...</p>

            <div className="mt-6 flex gap-1 justify-center">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-neon-green"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {status === 'eliminated' && (
          <motion.div
            key="eliminated"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-10 w-full max-w-md text-center"
            style={{ borderColor: 'rgba(255,55,95,0.3)' }}
          >
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="font-orbitron font-bold text-2xl text-neon-pink mb-2">Eliminated</h1>
            <p className="text-white/50 font-poppins text-sm">You were removed from the session.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
