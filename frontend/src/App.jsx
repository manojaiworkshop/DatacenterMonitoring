import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import TerminalPage from './pages/TerminalPage'
import DatacenterMonitorPage from './pages/DatacenterMonitorPage'

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null
  }

  const ProtectedRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" />
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/datacenter" 
            element={
              <ProtectedRoute>
                <DatacenterMonitorPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/terminal" 
            element={
              <ProtectedRoute>
                <TerminalPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/datacenter" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
