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
import Contratos from './pages/Contratos'
import CrtMic from './pages/CrtMic' // Importando o novo módulo
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import UndoButton from './components/UndoButton'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DatabaseProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/inicio" replace />} />
              <Route path="inicio" element={<Dashboard />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="cargas" element={<Cargas />} />
              <Route path="contratos" element={<Contratos />} />
              <Route path="crt-mic" element={<CrtMic />} /> {/* Nova Rota */}
              <Route path="parceiros" element={<Parceiros />} />
              <Route path="clientes" element={<Clientes />} />
            </Route>
            </Routes>
            <UndoButton />
          </Router>
        </DatabaseProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App