import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8011/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Auth
export const adminLogin = (password) => api.post("/admin/login", { password });

// Room
export const getRoom = (roomCode) => api.get(`/room/${roomCode}`);

export const getRoomQR = (roomCode) => api.get(`/room/${roomCode}/qr`);

export const getRoomStats = (roomCode) => api.get(`/room/${roomCode}/stats`);

export const getLeaderboard = (roomCode) =>
  api.get(`/room/${roomCode}/leaderboard`);

// Players
export const joinGame = (name, collegeName, roomCode) =>
  api.post("/player/join", {
    name,
    department: collegeName,
    college_name: collegeName,
    room_code: roomCode,
  });

export const getPlayer = (playerId) => api.get(`/player/${playerId}`);

export const approvePlayer = (playerId) =>
  api.post(`/admin/approve/${playerId}`);

export const approveAll = (roomCode) =>
  api.post(`/admin/approve-all/${roomCode}`);

export const listPlayers = (roomCode) => api.get(`/room/${roomCode}/players`);

// Questions
export const getQuestionCount = () => api.get("/questions/count");

export const listQuestions = () => api.get("/questions");

export const clearQuestions = () => api.delete("/admin/questions/clear");

export const uploadQuestions = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/admin/upload-questions", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const seedQuestions = () => api.post("/admin/seed-questions");

export default api;
