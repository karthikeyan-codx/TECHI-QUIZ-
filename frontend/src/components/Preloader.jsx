import { motion } from 'framer-motion'

export default function Preloader() {
  return (
    <div className="fixed inset-0 bg-dark-900 bg-grid flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10"
           style={{ background: 'radial-gradient(circle, #00d4ff, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10"
           style={{ background: 'radial-gradient(circle, #bf5af2, transparent)' }} />

      {/* Rotating outer ring */}
      <motion.div
        className="absolute w-48 h-48 rounded-full border-2 border-transparent"
        style={{
          borderTopColor: '#00d4ff',
          borderRightColor: 'rgba(0,212,255,0.3)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute w-36 h-36 rounded-full border-2 border-transparent"
        style={{
          borderTopColor: '#bf5af2',
          borderLeftColor: 'rgba(191,90,242,0.3)',
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className="relative z-10 flex flex-col items-center gap-4"
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center font-orbitron font-black text-3xl text-dark-900"
          style={{
            background: 'linear-gradient(135deg, #00d4ff, #bf5af2)',
            boxShadow: '0 0 40px rgba(0, 212, 255, 0.6)',
          }}
        >
          TQ
        </div>

        <motion.h1
          className="font-orbitron font-bold text-3xl text-neon-glow"
          style={{ color: '#00d4ff' }}
          animate={{
            textShadow: [
              '0 0 10px #00d4ff',
              '0 0 30px #00d4ff, 0 0 60px #bf5af2',
              '0 0 10px #00d4ff',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Technical Quiz
        </motion.h1>

        <motion.p
          className="font-poppins text-white/40 text-sm tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Loading...
        </motion.p>

        {/* Loading bar */}
        <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden mt-2">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #00d4ff, #bf5af2)' }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.2, ease: 'easeOut' }}
          />
        </div>
      </motion.div>
    </div>
  )
}
