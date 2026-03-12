import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { joinGame } from "../utils/api";
import { Users, QrCode } from "lucide-react";

export default function JoinPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [room, setRoom] = useState(params.get("room") || "");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim() || !collegeName.trim() || !room.trim()) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await joinGame(name, collegeName, room);
      const player = res.data;
      localStorage.setItem("tq_player_id", player.id);
      localStorage.setItem("tq_player_name", player.name);
      localStorage.setItem("tq_room_code", room);
      toast.success("Joined!");
      navigate("/waiting");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 bg-grid flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-md"
      >
        <div className="text-center mb-7">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-orbitron font-black text-2xl text-dark-900 mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #00d4ff, #bf5af2)" }}
          >
            TQ
          </div>
          <div className="flex items-center justify-center gap-2 text-neon-blue mb-1">
            <QrCode className="w-4 h-4" />
            <span className="font-poppins text-sm text-white/50">
              QR Code Join
            </span>
          </div>
          <h1 className="font-orbitron font-bold text-2xl text-white">
            Join Quiz
          </h1>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="text-white/50 text-xs font-poppins mb-2 block">
              Your Name
            </label>
            <input
              type="text"
              className="input-neon"
              placeholder="e.g. Karthikeyan"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
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
              value={room}
              onChange={(e) =>
                setRoom(e.target.value.replace(/\D/g, "").slice(0, 5))
              }
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join Quiz"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
