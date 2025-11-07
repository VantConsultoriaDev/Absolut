import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { DatabaseProvider } from './contexts/DatabaseContext'
import UndoButton from './components/UndoButton'
import ProtectedRoute from './components/ProtectedRoute'
import ToastProvider from './components/ToastProvider'
import { AgendaProvider } from './agenda/AgendaContext' // NOVO
import NotificationModal from './agenda/NotificationModal' // NOVO

// Importação direta de Cargas para contornar o erro de lazy loading
import Cargas from './pages/Cargas'

// Lazy loading das páginas para reduzir o bundle inicial
const Login = React.lazy(() => import('./pages/Login'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Financeiro = React.lazy(() => import('./pages/Financeiro'))
const Parceiros = React.lazy(() => import('./pages/Parceiros'))
const Clientes = React.lazy(() => import('./pages/Clientes'))
const Contratos = React.lazy(() => import('./pages/Contratos'))
const CrtMic = React.lazy(() => import('./pages/CrtMic'))
const Agenda = React.lazy(() => import('./pages/Agenda')) // NOVO: Importando Agenda
const Layout = React.lazy(() => import('./components/Layout'))

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <DatabaseProvider>
            <AgendaProvider> {/* AgendaProvider agora é global */}
              <Router>
                <Suspense fallback={<div className="p-6 text-slate-600">Carregando...</div>}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                      <Route index element={<Navigate to="/inicio" replace />} />
                      <Route path="inicio" element={<Dashboard />} />
                      <Route path="financeiro" element={<Financeiro />} />
                      <Route path="cargas" element={<Cargas />} /> {/* Usando importação direta */}
                      <Route path="contratos" element={<Contratos />} />
                      <Route path="crt-mic" element={<CrtMic />} />
                      <Route path="parceiros" element={<Parceiros />} />
                      <Route path="clientes" element={<Clientes />} />
                      <Route path="agenda" element={<Agenda />} /> {/* NOVO: Rota Agenda */}
                    </Route>
                  </Routes>
                </Suspense>
                <UndoButton />
              </Router>
              <NotificationModal /> {/* NotificationModal agora é global */}
            </AgendaProvider>
          </DatabaseProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App