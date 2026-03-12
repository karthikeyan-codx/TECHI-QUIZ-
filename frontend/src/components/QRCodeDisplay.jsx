import { motion } from 'framer-motion'
import { Download, Users, QrCode } from 'lucide-react'

export default function QRCodeDisplay({ qrCode, joinUrl, roomCode }) {
  const downloadQR = () => {
    if (!qrCode) return
    const link = document.createElement('a')
    link.href = qrCode
    link.download = `TQ-Room-${roomCode}.png`
    link.click()
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-6 flex flex-col items-center gap-4"
    >
      <div className="flex items-center gap-2 text-neon-blue">
        <QrCode className="w-5 h-5" />
        <h3 className="font-orbitron font-bold text-sm tracking-wider">QR JOIN CODE</h3>
      </div>

      {qrCode ? (
        <motion.div
          animate={{ glow: [0, 1, 0] }}
          className="relative p-3 rounded-2xl"
          style={{
            background: '#0a0a0a',
            boxShadow: '0 0 30px rgba(0,212,255,0.3)',
          }}
        >
          <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-xl" />
        </motion.div>
      ) : (
        <div className="w-48 h-48 rounded-2xl bg-dark-600 flex items-center justify-center">
          <QrCode className="w-12 h-12 text-white/20" />
        </div>
      )}

      {/* Room Code pill */}
      <div
        className="px-6 py-2 rounded-full font-orbitron font-black text-2xl text-dark-900"
        style={{
          background: 'linear-gradient(135deg, #00d4ff, #bf5af2)',
          boxShadow: '0 0 20px rgba(0,212,255,0.4)',
        }}
      >
        {roomCode}
      </div>

      <div className="text-center">
        <p className="text-white/40 text-xs font-poppins">Scan QR or share room code</p>
        {joinUrl && (
          <p className="text-neon-blue/60 text-xs mt-1 font-mono truncate max-w-48">{joinUrl}</p>
        )}
      </div>

      <button onClick={downloadQR} className="btn-neon flex items-center gap-2 text-xs py-2 px-4">
        <Download className="w-4 h-4" />
        Download QR
      </button>

      <div className="flex items-center gap-2 text-white/30 text-xs">
        <Users className="w-3.5 h-3.5" />
        <span>Show on projector for mass join</span>
      </div>
    </motion.div>
  )
}
