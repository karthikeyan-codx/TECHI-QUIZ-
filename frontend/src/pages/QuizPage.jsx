import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Timer from "../components/Timer";
import { createPlayerWebSocket } from "../utils/websocket";
import { AlertTriangle, ChevronRight, Image as ImageIcon } from "lucide-react";

// ── Anti-cheat helpers ─────────────────────────────────────────────────────────
function setupAntiCheat(onCheat) {
  // Disable right-click
  const noContext = (e) => e.preventDefault();
  // Disable copy/paste/cut
  const noCopy = (e) => e.preventDefault();
  // Disable common developer tool shortcuts
  const noKeys = (e) => {
    if (
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && ["I", "J", "C", "U"].includes(e.key)) ||
      (e.ctrlKey && e.key === "U")
    ) {
      e.preventDefault();
    }
  };
  // Tab visibility change
  const onVisChange = () => {
    if (document.hidden) onCheat("tab_switch");
  };
  // Window blur
  const onBlur = () => onCheat("window_blur");

  document.addEventListener("contextmenu", noContext);
  document.addEventListener("copy", noCopy);
  document.addEventListener("paste", noCopy);
  document.addEventListener("cut", noCopy);
  document.addEventListener("keydown", noKeys);
  document.addEventListener("visibilitychange", onVisChange);
  window.addEventListener("blur", onBlur);

  // DevTools detection (basic size check)
  const devToolsCheck = setInterval(() => {
    if (
      window.outerWidth - window.innerWidth > 160 ||
      window.outerHeight - window.innerHeight > 160
    ) {
      onCheat("devtools_open");
      clearInterval(devToolsCheck);
    }
  }, 2000);

  return () => {
    document.removeEventListener("contextmenu", noContext);
    document.removeEventListener("copy", noCopy);
    document.removeEventListener("paste", noCopy);
    document.removeEventListener("cut", noCopy);
    document.removeEventListener("keydown", noKeys);
    document.removeEventListener("visibilitychange", onVisChange);
    window.removeEventListener("blur", onBlur);
    clearInterval(devToolsCheck);
  };
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function QuizPage() {
  const navigate = useNavigate();
  const sendRef = useRef(null);
  const wsRef = useRef(null);
  const cheatFiredRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const questionStartTimeRef = useRef(Date.now());

  const [question, setQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(60);
  const [round, setRound] = useState("");
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [eliminated, setEliminated] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  const playerId = parseInt(localStorage.getItem("tq_player_id"));
  const roomCode = localStorage.getItem("tq_room_code");

  // ── Cheat handler ────────────────────────────────────────────────────────────
  const handleCheat = useCallback((reason) => {
    if (cheatFiredRef.current) return;
    cheatFiredRef.current = true;
    sendRef.current?.("cheat_detected", { reason });
    setEliminated(true);
  }, []);

  // ── WebSocket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playerId || !roomCode) {
      navigate("/");
      return;
    }

    const { ws, send } = createPlayerWebSocket(roomCode, playerId, {
      onMessage: (msg) => {
        switch (msg.type) {
          case "question":
            setQuestion(msg);
            setQuestionIndex(msg.question_index);
            setTotalQuestions(msg.total_questions);
            setRound(msg.round || "");
            setSelectedOption(null);
            setAnswered(false);
            questionStartTimeRef.current = Date.now();
            // play tick sound
            playSound();
            break;

          case "timer":
            setTimeLeft(msg.remaining);
            break;

          case "quiz_end":
            setFinished(true);
            const totalTime = (Date.now() - startTimeRef.current) / 1000;
            send("quiz_finished", { total_time: totalTime });
            break;

          case "result":
            setScore(msg.score);
            localStorage.setItem("tq_score", msg.score);
            localStorage.setItem("tq_total_time", msg.total_time);
            setTimeout(() => navigate("/result"), 2000);
            break;

          case "eliminated":
            setEliminated(true);
            break;

          case "quiz_paused":
            toast("Quiz paused by admin", { icon: "⏸️" });
            break;

          case "quiz_resumed":
            toast("Quiz resumed!", { icon: "▶️" });
            break;
        }
      },
    });

    wsRef.current = ws;
    sendRef.current = send;

    // Anti-cheat setup
    const cleanup = setupAntiCheat(handleCheat);

    return () => {
      ws.close();
      cleanup();
    };
  }, []);

  // ── Select answer ────────────────────────────────────────────────────────────
  const selectOption = (option) => {
    if (answered || eliminated) return;
    setSelectedOption(option);
    setAnswered(true);

    const timeTaken = (Date.now() - questionStartTimeRef.current) / 1000;
    sendRef.current?.("submit_answer", {
      question_id: question.id,
      selected_option: option,
      time_taken: timeTaken,
    });
  };

  // ── Sound effect ─────────────────────────────────────────────────────────────
  const playSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  // ── Eliminated Screen ─────────────────────────────────────────────────────────
  if (eliminated) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 max-w-md w-full text-center"
          style={{
            borderColor: "rgba(255,55,95,0.4)",
            boxShadow: "0 0 40px rgba(255,55,95,0.2)",
          }}
        >
          <div className="text-7xl mb-6">🚫</div>
          <h1 className="font-orbitron font-black text-3xl text-neon-pink mb-3">
            ELIMINATED
          </h1>
          <p className="text-white/50 font-poppins">
            Tab switch or window blur detected.
          </p>
          <p className="text-white/30 font-poppins text-sm mt-2">
            Your quiz has been terminated.
          </p>
          <div
            className="mt-8 px-6 py-3 rounded-xl font-poppins text-sm"
            style={{
              background: "rgba(255,55,95,0.1)",
              border: "1px solid rgba(255,55,95,0.2)",
              color: "#ff375f",
            }}
          >
            Status: Eliminated for cheating
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Finished Screen ────────────────────────────────────────────────────────────
  if (finished) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 max-w-md w-full text-center"
          style={{
            borderColor: "rgba(48,209,88,0.3)",
            boxShadow: "0 0 30px rgba(48,209,88,0.15)",
          }}
        >
          <div className="text-7xl mb-4">✅</div>
          <h1 className="font-orbitron font-bold text-2xl text-neon-green mb-2">
            Quiz Completed!
          </h1>
          <p className="text-white/40 font-poppins">
            Calculating your results...
          </p>
          <div className="mt-4 flex gap-1 justify-center">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-neon-green"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── No question yet ────────────────────────────────────────────────────────────
  if (!question) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="w-16 h-16 rounded-full border-2 border-transparent mx-auto mb-4"
            style={{ borderTopColor: "#00d4ff" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-white/40 font-poppins text-sm">
            Waiting for question...
          </p>
        </div>
      </div>
    );
  }

  const roundColor =
    questionIndex < 20 ? "#00d4ff" : questionIndex < 40 ? "#bf5af2" : "#30d158";
  const progress = (questionIndex / totalQuestions) * 100;

  return (
    <div
      className="min-h-screen bg-dark-900 bg-grid flex flex-col select-none"
      style={{ userSelect: "none" }}
    >
      {/* Top progress bar */}
      <div className="h-1 bg-dark-600 w-full">
        <motion.div
          className="h-full"
          style={{
            background: "linear-gradient(90deg, #00d4ff, #bf5af2)",
            width: `${progress}%`,
          }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-xs font-semibold px-3 py-1 rounded-full font-poppins mb-1"
              style={{
                background: `${roundColor}15`,
                border: `1px solid ${roundColor}30`,
                color: roundColor,
              }}
            >
              {round}
            </div>
            <p className="text-white/30 text-xs font-poppins">
              Question {questionIndex + 1} of {totalQuestions}
            </p>
          </div>
          <Timer timeLeft={timeLeft} />
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-6 flex-1"
          >
            {/* Image clue block — no text, always reserve 3 clue tiles */}
            {(question.image1 || question.image2 || question.image3) && (
              <div className="mb-6">
                <div className="grid grid-cols-3 gap-3">
                  {[question.image1, question.image2, question.image3].map(
                    (img, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: i * 0.12,
                          type: "spring",
                          stiffness: 200,
                        }}
                        className="relative rounded-2xl overflow-hidden flex items-center justify-center p-3"
                        style={{
                          background:
                            "radial-gradient(circle at top, rgba(0,212,255,0.14), rgba(0,212,255,0.04) 55%, rgba(0,0,0,0.18))",
                          border: "1.5px solid rgba(0,212,255,0.25)",
                          boxShadow:
                            "0 0 30px rgba(0,212,255,0.08), inset 0 0 20px rgba(0,212,255,0.03)",
                          minHeight: "140px",
                        }}
                      >
                        {img ? (
                          <img
                            src={img}
                            alt={`clue-${i + 1}`}
                            className="object-contain drop-shadow-2xl"
                            style={{ width: "104px", height: "104px" }}
                            draggable={false}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fallback =
                                e.currentTarget.nextElementSibling;
                              if (fallback) {
                                fallback.style.display = "flex";
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className="items-center justify-center w-full h-full"
                          style={{ display: img ? "none" : "flex" }}
                        >
                          <div
                            className="rounded-full flex items-center justify-center"
                            style={{
                              width: "72px",
                              height: "72px",
                              background: "rgba(0,212,255,0.12)",
                              border: "1px solid rgba(0,212,255,0.18)",
                            }}
                          >
                            <ImageIcon
                              size={30}
                              color="#00d4ff"
                              opacity={0.75}
                            />
                          </div>
                        </div>
                        <span
                          className="absolute top-1.5 left-2 text-xs font-orbitron opacity-25"
                          style={{ color: "#00d4ff" }}
                        >
                          {i + 1}
                        </span>
                      </motion.div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Code block for Round 3 */}
            {question.question_type === "code" && (
              <div
                className="mb-4 p-4 rounded-xl font-mono text-sm overflow-x-auto"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(0,212,255,0.1)",
                  color: "#00d4ff",
                }}
              >
                <pre>{question.question}</pre>
              </div>
            )}

            {/* Question text — hide whenever the question uses image clues */}
            {!(question.image1 || question.image2 || question.image3) && (
              <h2 className="font-poppins font-semibold text-white text-lg leading-relaxed mb-6">
                {question.question_type === "code"
                  ? "What is the output / error?"
                  : question.question}
              </h2>
            )}

            {/* Options */}
            <div className="space-y-3">
              {question.options?.map((opt, i) => (
                <motion.button
                  key={i}
                  whileHover={!answered ? { x: 4 } : {}}
                  whileTap={!answered ? { scale: 0.99 } : {}}
                  onClick={() => selectOption(opt)}
                  className={`option-btn ${selectedOption === opt ? "selected" : ""} ${answered && selectedOption !== opt ? "opacity-50" : ""}`}
                  disabled={answered}
                >
                  <span className="inline-flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-orbitron font-bold shrink-0"
                      style={{
                        background:
                          selectedOption === opt
                            ? "rgba(0,212,255,0.2)"
                            : "rgba(255,255,255,0.05)",
                        border: `1px solid ${selectedOption === opt ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                        color:
                          selectedOption === opt
                            ? "#00d4ff"
                            : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Answered hint */}
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 text-neon-green text-sm font-poppins"
              >
                <ChevronRight className="w-4 h-4" />
                Answer submitted — waiting for next question
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
