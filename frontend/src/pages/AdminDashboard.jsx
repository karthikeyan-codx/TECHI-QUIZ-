import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Users,
  Play,
  Pause,
  Square,
  BarChart2,
  QrCode,
  Upload,
  Trash2,
  CheckSquare,
  RefreshCw,
  Award,
  Shield,
  Zap,
  AlertTriangle,
  Download,
  Eye,
  BookOpen,
} from "lucide-react";
import {
  approvePlayer,
  approveAll,
  listPlayers,
  getRoomQR,
  getRoomStats,
  getLeaderboard,
  uploadQuestions,
  clearQuestions,
  seedQuestions,
  getQuestionCount,
  listQuestions,
} from "../utils/api";
import { createAdminWebSocket } from "../utils/websocket";
import Leaderboard from "../components/Leaderboard";
import QRCodeDisplay from "../components/QRCodeDisplay";

const TABS = [
  { id: "players", label: "Players", icon: Users },
  { id: "control", label: "Quiz Control", icon: Zap },
  { id: "qr", label: "QR Code", icon: QrCode },
  { id: "leaderboard", label: "Leaderboard", icon: Award },
  { id: "questions", label: "Questions", icon: BookOpen },
];

const statusColor = {
  waiting: "text-yellow-400 bg-yellow-400/10",
  approved: "text-green-400  bg-green-400/10",
  playing: "text-blue-400   bg-blue-400/10",
  finished: "text-purple-400 bg-purple-400/10",
  eliminated: "text-red-400    bg-red-400/10",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const sendRef = useRef(null);
  const fileRef = useRef(null);
  const pollRef = useRef(null);

  const [tab, setTab] = useState("players");
  const [roomCode] = useState(() => localStorage.getItem("tq_room_code") || "");
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [qrData, setQrData] = useState(null);
  const [quizState, setQuizState] = useState({
    started: false,
    paused: false,
    ended: false,
  });
  const [qCount, setQCount] = useState(null);
  const [questionPreview, setQuestionPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveLog, setLiveLog] = useState([]);

  // ── guard ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) {
      toast.error("No active room. Please login again.");
      navigate("/");
    }
  }, [roomCode, navigate]);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return;
    const { ws, send } = createAdminWebSocket(roomCode, {
      onOpen: () => {
        setWsConnected(true);
        toast.success("Live connection established");
      },
      onClose: () => setWsConnected(false),
      onError: () => setWsConnected(false),
      onMessage: (data) => handleWsMessage(data),
    });
    wsRef.current = ws;
    sendRef.current = send;
    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  const handleWsMessage = useCallback((data) => {
    const { event } = data;
    setLiveLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${event}`,
      ...prev.slice(0, 49),
    ]);
    switch (event) {
      case "quiz_started":
        setQuizState({ started: true, paused: false, ended: false });
        toast.success("Quiz started!");
        break;
      case "quiz_paused":
        setQuizState((s) => ({ ...s, paused: true }));
        toast("Quiz paused", { icon: "⏸" });
        break;
      case "quiz_resumed":
        setQuizState((s) => ({ ...s, paused: false }));
        toast("Quiz resumed", { icon: "▶️" });
        break;
      case "quiz_ended":
        setQuizState({ started: false, paused: false, ended: true });
        toast.success("Quiz ended");
        fetchLeaderboard();
        break;
      case "player_joined":
      case "player_approved":
      case "player_eliminated":
      case "player_finished":
        fetchPlayers();
        fetchStats();
        break;
      case "question_change":
        fetchStats();
        break;
      default:
        break;
    }
  }, []); // fetchPlayers / fetchStats are stable refs defined below

  // ── Polling ────────────────────────────────────────────────────────────────
  const fetchPlayers = useCallback(() => {
    if (!roomCode) return;
    listPlayers(roomCode)
      .then((r) => setPlayers(r.data))
      .catch(() => {});
  }, [roomCode]);

  const fetchStats = useCallback(() => {
    if (!roomCode) return;
    getRoomStats(roomCode)
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, [roomCode]);

  const fetchLeaderboard = useCallback(() => {
    if (!roomCode) return;
    getLeaderboard(roomCode)
      .then((r) => setLeaderboard(r.data?.leaderboard || r.data || []))
      .catch(() => {});
  }, [roomCode]);

  const fetchQR = useCallback(() => {
    if (!roomCode) return;
    getRoomQR(roomCode)
      .then((r) => setQrData(r.data))
      .catch(() => {});
  }, [roomCode]);

  const fetchQCount = useCallback(() => {
    getQuestionCount()
      .then((r) => setQCount(r.data))
      .catch(() => {});
  }, []);

  const fetchQuestionPreview = useCallback(() => {
    listQuestions()
      .then((r) => {
        setQuestionPreview(r.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPlayers();
    fetchStats();
    fetchQR();
    fetchQCount();
    pollRef.current = setInterval(() => {
      fetchPlayers();
      fetchStats();
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchPlayers, fetchStats, fetchQR, fetchQCount]);

  useEffect(() => {
    if (tab === "leaderboard") fetchLeaderboard();
    if (tab === "questions") fetchQuestionPreview();
  }, [tab, fetchLeaderboard, fetchQuestionPreview]);

  // ── Quiz actions ───────────────────────────────────────────────────────────
  const startQuiz = () => sendRef.current?.("start_quiz");
  const pauseQuiz = () => sendRef.current?.("pause_quiz");
  const resumeQuiz = () => sendRef.current?.("resume_quiz");
  const endQuiz = () => {
    if (
      window.confirm("End the quiz for ALL players? This cannot be undone.")
    ) {
      sendRef.current?.("end_quiz");
    }
  };

  // ── Player actions ─────────────────────────────────────────────────────────
  const handleApprove = async (playerId) => {
    try {
      await approvePlayer(playerId);
      fetchPlayers();
      toast.success("Player approved");
    } catch {
      toast.error("Approval failed");
    }
  };

  const handleApproveAll = async () => {
    try {
      const r = await approveAll(roomCode);
      toast.success(`${r.data.approved_count} players approved`);
      fetchPlayers();
    } catch {
      toast.error("Failed to approve all");
    }
  };

  // ── Question actions ───────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const r = await uploadQuestions(file);
      toast.success(`Uploaded ${r.data.inserted} questions`);
      fetchQCount();
      fetchQuestionPreview();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const r = await seedQuestions();
      toast.success(`Seeded ${r.data.inserted} questions`);
      fetchQCount();
      fetchQuestionPreview();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Delete ALL questions? This is irreversible!")) return;
    try {
      await clearQuestions();
      toast.success("Questions cleared");
      fetchQCount();
      setQuestionPreview([]);
    } catch {
      toast.error("Clear failed");
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const StatCard = ({ label, value, color = "neon-blue" }) => (
    <div className="glass-card p-4 text-center">
      <div
        className={`text-3xl font-bold font-orbitron ${color === "neon-blue" ? "text-neon-blue" : color === "green" ? "text-green-400" : color === "red" ? "text-red-400" : color === "yellow" ? "text-yellow-400" : "text-purple-400"}`}
      >
        {value ?? "—"}
      </div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );

  const roundPreviewSections = [
    {
      key: "image",
      title: "Round 1 — Image Identification",
      description: "Visual clue questions",
    },
    {
      key: "theory",
      title: "Round 2 — Theory",
      description: "Concept and command questions",
    },
    {
      key: "code",
      title: "Round 3 — Code",
      description: "Output and code analysis questions",
    },
  ]
    .map((section, sectionIndex, allSections) => {
      const questions = questionPreview.filter((q) => q.type === section.key);
      const startIndex = allSections
        .slice(0, sectionIndex)
        .reduce(
          (count, previousSection) =>
            count +
            questionPreview.filter((q) => q.type === previousSection.key)
              .length,
          0,
        );

      return {
        ...section,
        questions,
        startIndex,
      };
    })
    .filter((section) => section.questions.length > 0);

  return (
    <div className="min-h-screen bg-dark-bg pt-4 pb-10 px-4">
      {/* ── Header ── */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-blue to-purple-500 flex items-center justify-center font-orbitron font-bold text-sm">
              TQ
            </div>
            <div>
              <h1 className="font-orbitron text-neon-blue text-lg font-bold">
                Admin Dashboard
              </h1>
              <p className="text-xs text-gray-400">
                Room:{" "}
                <span className="text-white font-mono tracking-widest">
                  {roomCode}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* WS status */}
            <div
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${wsConnected ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-red-500/40 bg-red-500/10 text-red-400"}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
              />
              {wsConnected ? "Live" : "Disconnected"}
            </div>

            {/* Quiz state badge */}
            {quizState.ended && (
              <div className="text-xs px-3 py-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-400">
                Ended
              </div>
            )}
            {quizState.started && !quizState.ended && (
              <div
                className={`text-xs px-3 py-1.5 rounded-full border ${quizState.paused ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" : "border-blue-500/40 bg-blue-500/10 text-blue-400"}`}
              >
                {quizState.paused ? "⏸ Paused" : "▶ Running"}
              </div>
            )}

            <button
              onClick={() => {
                localStorage.clear();
                navigate("/");
              }}
              className="text-xs px-3 py-1.5 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      {stats && (
        <div className="max-w-7xl mx-auto mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Joined"
            value={stats.total_joined}
            color="neon-blue"
          />
          <StatCard
            label="Approved"
            value={stats.total_approved}
            color="green"
          />
          <StatCard
            label="Playing"
            value={stats.total_playing}
            color="neon-blue"
          />
          <StatCard
            label="Finished"
            value={stats.total_finished}
            color="purple"
          />
          <StatCard
            label="Eliminated"
            value={stats.total_eliminated}
            color="red"
          />
          <StatCard
            label="Question"
            value={
              stats.total_questions > 0
                ? `${stats.current_question + 1}/${stats.total_questions}`
                : "—"
            }
            color="yellow"
          />
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="glass-card p-1.5 flex gap-1 flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                tab === id
                  ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {/* ══ PLAYERS ══════════════════════════════════════════════════ */}
            {tab === "players" && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h2 className="font-orbitron text-neon-blue text-lg flex items-center gap-2">
                    <Users size={18} /> Player Management
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={fetchPlayers}
                      className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5"
                    >
                      <RefreshCw size={13} /> Refresh
                    </button>
                    <button
                      onClick={handleApproveAll}
                      className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5"
                    >
                      <CheckSquare size={13} /> Approve All
                    </button>
                  </div>
                </div>

                {players.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No players yet. Share the room code or QR code.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-500 text-xs uppercase">
                          <th className="text-left py-2 px-3">#</th>
                          <th className="text-left py-2 px-3">Name</th>
                          <th className="text-left py-2 px-3">College</th>
                          <th className="text-left py-2 px-3">Status</th>
                          <th className="text-left py-2 px-3">Score</th>
                          <th className="text-left py-2 px-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((p, i) => (
                          <tr
                            key={p.id}
                            className="border-b border-white/5 hover:bg-white/3 transition-colors"
                          >
                            <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                            <td className="py-2 px-3 font-medium text-white">
                              {p.name}
                            </td>
                            <td className="py-2 px-3 text-gray-400">
                              {p.college_name || p.department}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColor[p.status] || "text-gray-400"}`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-neon-blue">
                              {p.score}
                            </td>
                            <td className="py-2 px-3">
                              {p.status === "waiting" && (
                                <button
                                  onClick={() => handleApprove(p.id)}
                                  className="text-xs px-3 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors"
                                >
                                  Approve
                                </button>
                              )}
                              {p.status === "approved" && (
                                <span className="text-xs text-green-400">
                                  ✓ Ready
                                </span>
                              )}
                              {p.status === "eliminated" && (
                                <span className="text-xs text-red-400 flex items-center gap-1">
                                  <AlertTriangle size={11} /> Eliminated
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ══ QUIZ CONTROL ══════════════════════════════════════════════ */}
            {tab === "control" && (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Control panel */}
                <div className="glass-card p-6">
                  <h2 className="font-orbitron text-neon-blue text-lg flex items-center gap-2 mb-6">
                    <Zap size={18} /> Quiz Control
                  </h2>

                  <div className="space-y-3">
                    {!quizState.started && !quizState.ended && (
                      <button
                        onClick={startQuiz}
                        className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-lg"
                      >
                        <Play size={20} /> Start Quiz
                      </button>
                    )}

                    {quizState.started &&
                      !quizState.paused &&
                      !quizState.ended && (
                        <button
                          onClick={pauseQuiz}
                          className="w-full flex items-center justify-center gap-2 py-4 text-lg rounded-xl font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30 transition-all"
                        >
                          <Pause size={20} /> Pause Quiz
                        </button>
                      )}

                    {quizState.paused && (
                      <button
                        onClick={resumeQuiz}
                        className="w-full flex items-center justify-center gap-2 py-4 text-lg rounded-xl font-semibold bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30 transition-all"
                      >
                        <Play size={20} /> Resume Quiz
                      </button>
                    )}

                    {quizState.started && !quizState.ended && (
                      <button
                        onClick={endQuiz}
                        className="w-full flex items-center justify-center gap-2 py-3 text-base rounded-xl font-semibold bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition-all"
                      >
                        <Square size={18} /> End Quiz
                      </button>
                    )}

                    {quizState.ended && (
                      <div className="text-center py-8">
                        <Award
                          size={40}
                          className="mx-auto text-purple-400 mb-3"
                        />
                        <p className="text-purple-400 font-orbitron">
                          Quiz Completed!
                        </p>
                        <button
                          onClick={() => setTab("leaderboard")}
                          className="mt-3 btn-primary text-sm"
                        >
                          View Leaderboard
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick stats */}
                  {stats && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <p className="text-xs text-gray-500 uppercase mb-3">
                        Live Stats
                      </p>
                      <div className="space-y-2">
                        {[
                          {
                            label: "Players Joined",
                            v: stats.total_joined,
                            col: "text-neon-blue",
                          },
                          {
                            label: "Approved",
                            v: stats.total_approved,
                            col: "text-green-400",
                          },
                          {
                            label: "Currently Playing",
                            v: stats.total_playing,
                            col: "text-blue-400",
                          },
                          {
                            label: "Finished",
                            v: stats.total_finished,
                            col: "text-purple-400",
                          },
                          {
                            label: "Eliminated",
                            v: stats.total_eliminated,
                            col: "text-red-400",
                          },
                        ].map(({ label, v, col }) => (
                          <div
                            key={label}
                            className="flex justify-between items-center"
                          >
                            <span className="text-sm text-gray-400">
                              {label}
                            </span>
                            <span className={`font-mono font-bold ${col}`}>
                              {v}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Live log */}
                <div className="glass-card p-6">
                  <h2 className="font-orbitron text-neon-blue text-lg flex items-center gap-2 mb-4">
                    <Eye size={18} /> Live Event Log
                  </h2>
                  <div className="h-64 overflow-y-auto space-y-1 font-mono text-xs">
                    {liveLog.length === 0 ? (
                      <p className="text-gray-600 text-center mt-10">
                        Waiting for events…
                      </p>
                    ) : (
                      liveLog.map((line, i) => (
                        <div
                          key={i}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {line}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══ QR CODE ═══════════════════════════════════════════════════ */}
            {tab === "qr" && (
              <div className="max-w-lg mx-auto">
                <div className="glass-card p-8 text-center">
                  <h2 className="font-orbitron text-neon-blue text-xl mb-2 flex items-center justify-center gap-2">
                    <QrCode size={20} /> QR Code Join
                  </h2>
                  <p className="text-gray-400 text-sm mb-6">
                    Players scan this to jump directly to the join page
                  </p>

                  {qrData ? (
                    <>
                      <QRCodeDisplay
                        qrBase64={qrData.qr_code}
                        joinUrl={qrData.join_url}
                      />
                      <div className="mt-4 p-3 rounded-xl bg-black/30 border border-white/10">
                        <p className="text-xs text-gray-500 mb-1">Room Code</p>
                        <p className="font-orbitron text-3xl tracking-widest text-neon-blue">
                          {roomCode}
                        </p>
                      </div>
                      <div className="mt-3 p-3 rounded-xl bg-black/30 border border-white/10">
                        <p className="text-xs text-gray-500 mb-1">Join Link</p>
                        <p className="text-xs text-gray-300 break-all font-mono">
                          {qrData.join_url}
                        </p>
                      </div>
                      <a
                        href={qrData.qr_code}
                        download={`room-${roomCode}-qr.png`}
                        className="mt-4 btn-primary w-full flex items-center justify-center gap-2"
                      >
                        <Download size={16} /> Download QR Code
                      </a>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-gray-500">
                      <RefreshCw size={24} className="animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ LEADERBOARD ══════════════════════════════════════════════ */}
            {tab === "leaderboard" && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-orbitron text-neon-blue text-lg flex items-center gap-2">
                    <Award size={18} /> Leaderboard
                  </h2>
                  <button
                    onClick={fetchLeaderboard}
                    className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5"
                  >
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
                <Leaderboard data={leaderboard} />
              </div>
            )}

            {/* ══ QUESTIONS ════════════════════════════════════════════════ */}
            {tab === "questions" && (
              <div className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Stats */}
                  <div className="glass-card p-6">
                    <h2 className="font-orbitron text-neon-blue text-lg flex items-center gap-2 mb-4">
                      <BarChart2 size={18} /> Question Bank
                    </h2>
                    {qCount ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 rounded-xl bg-neon-blue/5 border border-neon-blue/20">
                          <span className="text-gray-300">Total Questions</span>
                          <span className="font-orbitron text-neon-blue text-xl">
                            {qCount.total}
                          </span>
                        </div>
                        {Object.entries(qCount.by_type || {}).map(
                          ([type, count]) => (
                            <div
                              key={type}
                              className="flex justify-between items-center p-3 rounded-xl bg-white/3 border border-white/10"
                            >
                              <span className="capitalize text-gray-400 text-sm">
                                {type === "image"
                                  ? "🖼 Image (Round 1)"
                                  : type === "theory"
                                    ? "📚 Theory (Round 2)"
                                    : "💻 Code (Round 3)"}
                              </span>
                              <span
                                className={`font-mono font-bold ${count >= 20 ? "text-green-400" : "text-yellow-400"}`}
                              >
                                {count}/20
                              </span>
                            </div>
                          ),
                        )}
                        {qCount.total < 60 && (
                          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm flex items-start gap-2">
                            <AlertTriangle
                              size={16}
                              className="mt-0.5 shrink-0"
                            />
                            <span>
                              Need at least 60 questions (20 per round) to start
                              the quiz. Use "Seed Questions" to load all 60.
                            </span>
                          </div>
                        )}
                        {qCount.total >= 60 && (
                          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
                            <Shield size={16} /> Quiz is ready to start!
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32 text-gray-500">
                        <RefreshCw size={20} className="animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="glass-card p-6 space-y-4">
                    <h2 className="font-orbitron text-neon-blue text-lg flex items-center gap-2 mb-2">
                      <Upload size={18} /> Manage Questions
                    </h2>

                    {/* Seed */}
                    <div className="p-4 rounded-xl bg-white/3 border border-white/10">
                      <p className="text-sm font-semibold text-white mb-1">
                        Load Built-in 60 Questions
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        Seeds all 60 pre-made questions (20 image + 20 theory +
                        20 code) into the database instantly.
                      </p>
                      <button
                        onClick={handleSeed}
                        disabled={seeding}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        {seeding ? (
                          <RefreshCw size={15} className="animate-spin" />
                        ) : (
                          <Zap size={15} />
                        )}
                        {seeding ? "Seeding…" : "Seed 60 Questions"}
                      </button>
                    </div>

                    {/* Upload Excel */}
                    <div className="p-4 rounded-xl bg-white/3 border border-white/10">
                      <p className="text-sm font-semibold text-white mb-1">
                        Upload Excel File
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        Columns:{" "}
                        <code className="text-neon-blue">
                          type, question, option1-4, correct_answer
                        </code>
                      </p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleUpload}
                        className="hidden"
                        id="excel-upload"
                      />
                      <label
                        htmlFor="excel-upload"
                        className={`btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        {uploading ? (
                          <RefreshCw size={15} className="animate-spin" />
                        ) : (
                          <Upload size={15} />
                        )}
                        {uploading ? "Uploading…" : "Choose Excel File"}
                      </label>
                    </div>

                    {/* Clear */}
                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                      <p className="text-sm font-semibold text-red-400 mb-1">
                        Danger Zone
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        Permanently deletes all questions from the database.
                      </p>
                      <button
                        onClick={handleClear}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all text-sm font-semibold"
                      >
                        <Trash2 size={15} /> Clear All Questions
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                    <h2 className="font-orbitron text-neon-blue text-lg flex items-center gap-2">
                      <Eye size={18} /> All Question Preview
                    </h2>
                    <button
                      onClick={fetchQuestionPreview}
                      className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5"
                    >
                      <RefreshCw size={13} /> Refresh Preview
                    </button>
                  </div>

                  {questionPreview.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Eye size={28} className="mx-auto mb-3 opacity-30" />
                      <p>No questions available yet.</p>
                      <p className="text-xs mt-2 text-gray-600">
                        Seed or upload questions to preview all rounds here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {roundPreviewSections.map((section) => (
                        <div key={section.key} className="space-y-4">
                          <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-neon-blue/20 bg-neon-blue/5 px-4 py-3">
                            <div>
                              <h3 className="font-orbitron text-neon-blue text-base">
                                {section.title}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {section.description}
                              </p>
                            </div>
                            <span className="text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5 text-gray-300 font-mono">
                              {section.questions.length} questions
                            </span>
                          </div>

                          <div className="grid xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                            {section.questions.map((q, index) => (
                              <div
                                key={q.id}
                                className="rounded-2xl border border-white/10 bg-black/20 p-4"
                              >
                                <div className="flex items-center justify-between mb-3 gap-3">
                                  <div>
                                    <p className="text-xs uppercase tracking-widest text-neon-blue/80">
                                      Question {section.startIndex + index + 1}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {section.title}
                                    </p>
                                  </div>
                                  <span className="text-[11px] px-2 py-1 rounded-full border border-neon-blue/30 bg-neon-blue/10 text-neon-blue font-mono">
                                    {q.correct_answer}
                                  </span>
                                </div>

                                {q.type === "image" ? (
                                  <div className="grid grid-cols-3 gap-3">
                                    {[q.image1, q.image2, q.image3].map(
                                      (img, imageIndex) => (
                                        <div
                                          key={`${q.id}-${imageIndex}`}
                                          className="relative rounded-xl overflow-hidden flex items-center justify-center"
                                          style={{
                                            minHeight: "110px",
                                            background:
                                              "radial-gradient(circle at top, rgba(0,212,255,0.14), rgba(0,212,255,0.04) 55%, rgba(0,0,0,0.18))",
                                            border:
                                              "1px solid rgba(0,212,255,0.2)",
                                          }}
                                        >
                                          {img ? (
                                            <img
                                              src={img}
                                              alt={`preview-${section.startIndex + index + 1}-${imageIndex + 1}`}
                                              className="w-20 h-20 object-contain"
                                              loading="lazy"
                                              referrerPolicy="no-referrer"
                                            />
                                          ) : (
                                            <div className="text-xs text-gray-500">
                                              No image
                                            </div>
                                          )}
                                          <span className="absolute top-2 left-2 text-[10px] font-orbitron text-neon-blue/70">
                                            {imageIndex + 1}
                                          </span>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                      <p className="text-sm text-white leading-relaxed break-words">
                                        {q.question}
                                      </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {[
                                        q.option1,
                                        q.option2,
                                        q.option3,
                                        q.option4,
                                        q.option5,
                                      ]
                                        .filter(Boolean)
                                        .map((option, optionIndex) => (
                                          <div
                                            key={`${q.id}-option-${optionIndex}`}
                                            className={`rounded-lg border px-3 py-2 text-xs break-words ${option === q.correct_answer ? "border-green-500/40 bg-green-500/10 text-green-300" : "border-white/10 bg-white/5 text-gray-300"}`}
                                          >
                                            {option}
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
