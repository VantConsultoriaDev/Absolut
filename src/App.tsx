import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { DatabaseProvider } from './contexts/DatabaseContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Financeiro from './pages/Financeiro'
import Cargas from './pages/Cargas'
import Parceiros from './pages/Parceiros'
import Clientes from './pages/Clientes'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import UndoButton from './components/UndoButton'

function App() {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/inicio" replace />} />
              <Route path="inicio" element={<Dashboard />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="cargas" element={<Cargas />} />
              <Route path="parceiros" element={<Parceiros />} />
              <Route path="clientes" element={<Clientes />} />
            </Route>
            </Routes>
            <UndoButton />
          </Router>
        </AuthProvider>
      </DatabaseProvider>
    </ThemeProvider>
  )
}

export default App