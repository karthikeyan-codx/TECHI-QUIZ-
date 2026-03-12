import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import Preloader from './components/Preloader'
import HomePage from './pages/HomePage'
import AdminDashboard from './pages/AdminDashboard'
import WaitingRoom from './pages/WaitingRoom'
import QuizPage from './pages/QuizPage'
import ResultPage from './pages/ResultPage'
import JoinPage from './pages/JoinPage'

export default function App() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) return <Preloader />

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f0f1a',
            color: '#fff',
            border: '1px solid rgba(0,212,255,0.2)',
            fontFamily: 'Poppins, sans-serif',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/waiting" element={<WaitingRoom />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
