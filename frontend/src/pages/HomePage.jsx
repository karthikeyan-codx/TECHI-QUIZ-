import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { adminLogin, joinGame } from "../utils/api";
import { Shield, Users, Zap, Brain, Code, ChevronRight } from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // 'host' | 'join'

  // Admin form
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // Player form
  const [playerName, setPlayerName] = useState("");
  const [playerCollegeName, setPlayerCollegeName] = useState("");
  const [playerRoom, setPlayerRoom] = useState("");
  const [playerLoading, setPlayerLoading] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      const res = await adminLogin(adminPassword);
      const { room_code } = res.data;
      localStorage.setItem("tq_room_code", room_code);
      toast.success(`Room ${room_code} created!`);
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid password");
    } finally {
      setAdminLoading(false);
    }
  };

  const handlePlayerJoin = async (e) => {
    e.preventDefault();
    if (!playerName.trim() || !playerCollegeName.trim() || !playerRoom.trim()) {
      toast.error("Please fill all fields");
      return;
    }
    setPlayerLoading(true);
    try {
      const res = await joinGame(playerName, playerCollegeName, playerRoom);
      const player = res.data;
      localStorage.setItem("tq_player_id", player.id);
      localStorage.setItem("tq_player_name", player.name);
      localStorage.setItem("tq_room_code", playerRoom);
      toast.success("Joined! Waiting for admin approval...");
      navigate("/waiting");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not join room");
    } finally {
      setPlayerLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 bg-grid flex flex-col">
      {/* Background orbs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div
          className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-5"
          style={{
            background: "radial-gradient(circle, #00d4ff, transparent)",
          }}
        />
        <div
          className="absolute bottom-20 right-1/4 w-96 h-96 rounded-full opacity-5"
          style={{
            background: "radial-gradient(circle, #bf5af2, transparent)",
          }}
        />
      </div>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          {/* Logo */}
          <motion.div
            animate={{
              boxShadow: [
                "0 0 20px rgba(0,212,255,0.4)",
                "0 0 50px rgba(0,212,255,0.7)",
                "0 0 20px rgba(0,212,255,0.4)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-24 h-24 rounded-3xl flex items-center justify-center font-orbitron font-black text-4xl text-dark-900 mx-auto mb-6"
            style={{ background: "linear-gradient(135deg, #00d4ff, #bf5af2)" }}
          >
            TQ
          </motion.div>

          <h1
            className="font-orbitron font-black text-5xl md:text-6xl mb-3"
            style={{
              background: "linear-gradient(135deg, #00d4ff, #bf5af2)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Technical Quiz
          </h1>
          <p className="text-white/40 font-poppins text-lg tracking-wide">
            Real-time Multiplayer Tech Competition
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {[
              { icon: Zap, label: "Real-time", color: "#ffd60a" },
              { icon: Brain, label: "60 Questions", color: "#00d4ff" },
              { icon: Shield, label: "Anti-Cheat", color: "#bf5af2" },
              { icon: Code, label: "3 Rounds", color: "#30d158" },
            ].map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold font-poppins"
                style={{
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
                  color,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Mode selector */}
        {!mode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl"
          >
            {/* Host card */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setMode("host")}
              className="glass-card p-8 text-left group transition-all duration-300 hover:border-neon-purple/40"
              style={{ boxShadow: "none" }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                style={{
                  background: "rgba(191,90,242,0.15)",
                  border: "1px solid rgba(191,90,242,0.3)",
                }}
              >
                <Shield className="w-7 h-7 text-neon-purple" />
              </div>
              <h2 className="font-orbitron font-bold text-xl text-white mb-2">
                Host Event
              </h2>
              <p className="text-white/40 font-poppins text-sm leading-relaxed">
                Create & manage a quiz room. Control questions, approve players,
                and view the live leaderboard.
              </p>
              <div className="flex items-center gap-2 mt-5 text-neon-purple text-sm font-semibold">
                <span>Admin Login</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>

            {/* Join card */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setMode("join")}
              className="glass-card p-8 text-left group transition-all duration-300 hover:border-neon-blue/40"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                style={{
                  background: "rgba(0,212,255,0.15)",
                  border: "1px solid rgba(0,212,255,0.3)",
                }}
              >
                <Users className="w-7 h-7 text-neon-blue" />
              </div>
              <h2 className="font-orbitron font-bold text-xl text-white mb-2">
                Join Event
              </h2>
              <p className="text-white/40 font-poppins text-sm leading-relaxed">
                Enter your name, college name and room code to join a live
                technical quiz competition.
              </p>
              <div className="flex items-center gap-2 mt-5 text-neon-blue text-sm font-semibold">
                <span>Join Now</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* Admin Login Form */}
        {mode === "host" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 w-full max-w-md"
          >
            <button
              onClick={() => setMode(null)}
              className="text-white/30 hover:text-white text-sm mb-6 font-poppins flex items-center gap-1"
            >
              ← Back
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-neon-purple" />
              <h2 className="font-orbitron font-bold text-lg text-white">
                Admin Login
              </h2>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="text-white/50 text-xs font-poppins mb-2 block">
                  Admin Password
                </label>
                <input
                  type="password"
                  className="input-neon"
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={adminLoading}
                className="btn-primary w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adminLoading ? "Creating Room..." : "Create Room & Enter"}
              </button>
            </form>
          </motion.div>
        )}

        {/* Player Join Form */}
        {mode === "join" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 w-full max-w-md"
          >
            <button
              onClick={() => setMode(null)}
              className="text-white/30 hover:text-white text-sm mb-6 font-poppins flex items-center gap-1"
            >
              ← Back
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-neon-blue" />
              <h2 className="font-orbitron font-bold text-lg text-white">
                Join Quiz
              </h2>
            </div>
            <form onSubmit={handlePlayerJoin} className="space-y-4">
              <div>
                <label className="text-white/50 text-xs font-poppins mb-2 block">
                  Your Name
                </label>
                <input
                  type="text"
                  className="input-neon"
                  placeholder="e.g. Karthikeyan"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-white/50 text-xs font-poppins mb-2 block">
                  College Name
                </label>
                <input
                  type="text"
                  className="input-neon"
                  placeholder="e.g. KEC / PSG / Anna University"
                  value={playerCollegeName}
                  onChange={(e) => setPlayerCollegeName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-white/50 text-xs font-poppins mb-2 block">
                  Room Code
                </label>
                <input
                  type="text"
                  className="input-neon text-center tracking-[0.3em] font-orbitron text-xl"
                  placeholder="48392"
                  value={playerRoom}
                  onChange={(e) =>
                    setPlayerRoom(e.target.value.replace(/\D/g, "").slice(0, 5))
                  }
                  required
                />
              </div>
              <button
                type="submit"
                disabled={playerLoading}
                className="btn-primary w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {playerLoading ? "Joining..." : "Join Quiz"}
              </button>
            </form>
          </motion.div>
        )}
      </main>
    </div>
  );
}
