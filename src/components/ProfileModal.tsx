import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useModal } from '../hooks/useModal'
import { Eye, EyeOff, X } from 'lucide-react'

type ModalProps = { isOpen: boolean; onClose: () => void }

function ChangePasswordModal({ isOpen, onClose }: ModalProps) {
  const { changePassword } = useAuth()
  const { modalRef } = useModal({ isOpen, onClose })

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [errorCurrent, setErrorCurrent] = useState('')
  const [errorGeneral, setErrorGeneral] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCurrent('')
      setNext('')
      setShowCurrent(false)
      setShowNext(false)
      setErrorCurrent('')
      setErrorGeneral('')
      setSaving(false)
    }
  }, [isOpen])

  const handleConfirm = async () => {
    setErrorCurrent('')
    setErrorGeneral('')
    setSaving(true)
    const result = await changePassword(current, next)
    setSaving(false)
    if (!result.ok) {
      if (result.error === 'senha atual incorreta') {
        setErrorCurrent('senha atual incorreta')
        return
      }
      setErrorGeneral(result.error || 'Erro ao alterar senha')
      return
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mudar Senha</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha atual</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="input-field"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Digite sua senha atual"
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => setShowCurrent(v => !v)} aria-label="Mostrar/ocultar senha atual">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errorCurrent && <p className="mt-1 text-xs text-red-600">{errorCurrent}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova senha</label>
              <div className="relative">
                <input
                  type={showNext ? 'text' : 'password'}
                  className="input-field"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="Digite a nova senha"
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => setShowNext(v => !v)} aria-label="Mostrar/ocultar nova senha">
                  {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorGeneral && <p className="text-xs text-red-600">{errorGeneral}</p>}
            <div className="flex space-x-4 pt-6">
              <button className="btn-secondary flex-1" onClick={onClose} disabled={saving}>Cancelar</button>
              <button className="btn-primary flex-1" onClick={handleConfirm} disabled={saving || !current || !next}>{saving ? 'Salvando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfileModal({ isOpen, onClose }: ModalProps) {
  const { user, updateProfile } = useAuth()
  const { modalRef } = useModal({ isOpen, onClose })
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setFeedback('')
    }
  }, [isOpen, user])

  const handleSave = async () => {
    setSaving(true)
    const ok = await updateProfile(name)
    setSaving(false)
    if (ok) {
      setFeedback('Dados atualizados com sucesso')
      setTimeout(() => {
        onClose()
      }, 600)
    } else {
      setFeedback('Não foi possível atualizar os dados')
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meus Dados</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                <input
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                <input
                  type="email"
                  className="input-field"
                  value={email}
                  disabled
                />
              </div>
              <div className="pt-2">
                <button type="button" className="btn-secondary w-full justify-center" onClick={() => setPasswordOpen(true)}>
                  Mudar Senha
                </button>
              </div>
              {feedback && <p className="text-xs text-slate-600 dark:text-slate-300">{feedback}</p>}
              <div className="flex space-x-4 pt-6">
                <button className="btn-secondary flex-1" onClick={onClose} disabled={saving}>Cancelar</button>
                <button className="btn-primary flex-1" onClick={handleSave} disabled={saving || !name}>{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ChangePasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  )
}