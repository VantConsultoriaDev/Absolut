import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, Sun, Moon, Truck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseEnabled } from '../lib/supabaseClient'
import { useTheme } from '../contexts/ThemeContext'

const Login: React.FC = () => {
  const [email, setEmail] = useState('') // Alterado para email
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login, loginDemo, isAuthenticated } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  useEffect(() => {
    if (error) setError('')
  }, [email, password]) // Alterado para email

  if (isAuthenticated) {
    return <Navigate to="/inicio" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const success = await login(email, password) // Usar email
      if (!success) {
        setError('Email ou senha inválidos') // Mensagem de erro atualizada
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const ok = await loginDemo()
      if (!ok) {
        setError('Falha ao entrar no modo demonstração')
      }
    } catch (err) {
      setError('Erro ao iniciar modo demonstração.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="no-uppercase min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200 flex flex-col">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={toggleTheme}
          className="btn-ghost p-2"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Logo & Branding */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Truck className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">
                ABSOLUT
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                TRADING IMPORTACAO E EXPORTACAO
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email" // Alterado para tipo email
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="Digite seu email"
                autoComplete="email" // Alterado para email
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center text-base py-3"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Demo Mode */}
          <div className="space-y-3">
            {!isSupabaseEnabled && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                Supabase não configurado. Você pode usar o modo demonstração.
              </div>
            )}
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="btn-secondary w-full justify-center text-base py-3"
            >
              {loading ? 'Entrando...' : 'Entrar em modo demonstração'}
            </button>
          </div>

          {/* Footer Info */}
          <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            {/* Biblical Verse (dynamic) */}
            <DynamicVerse />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

// Componente auxiliar para buscar e exibir versículo aleatório
const DynamicVerse: React.FC = () => {
  const [text, setText] = useState('')
  const [reference, setReference] = useState('')
  const [loadingVerse, setLoadingVerse] = useState(true)

  useEffect(() => {
    // Sempre exibe mensagem em PT-BR usando uma lista local confiável
    setLoadingVerse(true)
    try {
      const idx = Math.floor(Math.random() * PT_BR_VERSES.length)
      const v = PT_BR_VERSES[idx]
      setText(v.text)
      setReference(v.reference)
    } finally {
      setLoadingVerse(false)
    }
  }, [])

  return (
    <div className="text-center space-y-2">
      <p className="text-xs italic text-slate-500 dark:text-slate-500">
        {loadingVerse ? 'Carregando versículo...' : text}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-600">
        {reference}
      </p>
    </div>
  )
}

// Lista local de versículos em PT-BR (texto e referência)
const PT_BR_VERSES: { text: string; reference: string }[] = [
  {
    text: 'Entrega o teu caminho ao Senhor; confia nele, e o mais ele fará.',
    reference: 'Salmos 37:5'
  },
  {
    text: 'O Senhor é o meu pastor; nada me faltará.',
    reference: 'Salmos 23:1'
  },
  {
    text: 'Tudo posso naquele que me fortalece.',
    reference: 'Filipenses 4:13'
  },
  {
    text: 'Confia no Senhor de todo o teu coração e não te apoies no teu próprio entendimento.',
    reference: 'Provérbios 3:5'
  },
  {
    text: 'Não andeis ansiosos por coisa alguma; antes, em tudo, sejam os vossos pedidos conhecidos diante de Deus pela oração e súplica, com ações de graças.',
    reference: 'Filipenses 4:6'
  },
  {
    text: 'O Senhor é a minha luz e a minha salvação; a quem temerei?',
    reference: 'Salmos 27:1'
  },
  {
    text: 'Esforça-te e tem bom ânimo; não temas, nem te espantes, porque o Senhor, teu Deus, é contigo por onde quer que andares.',
    reference: 'Josué 1:9'
  },
  {
    text: 'Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.',
    reference: 'Salmos 91:1'
  },
  {
    text: 'Clama a mim, e responder-te-ei; anunciar-te-ei coisas grandes e firmes, que não sabes.',
    reference: 'Jeremias 33:3'
  },
  {
    text: 'Se Deus é por nós, quem será contra nós?',
    reference: 'Romanos 8:31'
  },
  {
    text: 'Buscai, pois, em primeiro lugar, o Reino de Deus e a sua justiça, e todas estas coisas vos serão acrescentadas.',
    reference: 'Mateus 6:33'
  },
  {
    text: 'Bem-aventurados os pacificadores, porque serão chamados filhos de Deus.',
    reference: 'Mateus 5:9'
  }
]