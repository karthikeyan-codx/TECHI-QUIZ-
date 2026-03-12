import { motion } from "framer-motion";
import { Trophy, Medal, Award, Clock, Building2, Star } from "lucide-react";

function RankIcon({ rank }) {
  if (rank === 1)
    return <Trophy className="w-5 h-5" style={{ color: "#ffd60a" }} />;
  if (rank === 2)
    return <Medal className="w-5 h-5" style={{ color: "#c0c0c0" }} />;
  if (rank === 3)
    return <Award className="w-5 h-5" style={{ color: "#cd7f32" }} />;
  return (
    <span className="font-orbitron font-bold text-sm text-white/50">
      #{rank}
    </span>
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function Leaderboard({ entries = [] }) {
  if (!entries.length) {
    return (
      <div className="text-center py-16 text-white/30">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-poppins">No results yet</p>
      </div>
    );
  }

  const top3Colors = ["#ffd60a", "#c0c0c0", "#cd7f32"];

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <motion.div
          key={entry.player_id}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="glass-card px-5 py-4 flex items-center gap-4"
          style={
            i < 3
              ? {
                  borderColor: `${top3Colors[i]}30`,
                  boxShadow: `0 0 15px ${top3Colors[i]}15`,
                }
              : {}
          }
        >
          {/* Rank */}
          <div className="w-10 flex justify-center">
            <RankIcon rank={entry.rank} />
          </div>

          {/* Name & College */}
          <div className="flex-1 min-w-0">
            <p className="font-poppins font-semibold text-white truncate">
              {entry.name}
            </p>
            <div className="flex items-center gap-1 text-white/40 text-xs">
              <Building2 className="w-3 h-3" />
              <span>{entry.college_name || entry.department}</span>
            </div>
          </div>

          {/* Score */}
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1.5 justify-end">
              <Star className="w-4 h-4 text-neon-yellow" />
              <span
                className="font-orbitron font-bold text-lg"
                style={{ color: i < 3 ? top3Colors[i] : "#00d4ff" }}
              >
                {entry.score}
              </span>
              <span className="text-white/30 text-xs font-poppins">/60</span>
            </div>
            <div className="flex items-center gap-1 text-white/40 text-xs justify-end mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{formatTime(entry.time_taken)}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
