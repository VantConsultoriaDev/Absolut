import { useEffect, useRef } from 'react'

interface UseModalProps {
  isOpen: boolean
  onClose: () => void
  closeOnEscape?: boolean
  closeOnOutsideClick?: boolean
}

export const useModal = ({
  isOpen,
  onClose,
  closeOnEscape = true,
  closeOnOutsideClick = true
}: UseModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null)

  // Modal stack to ensure only the topmost modal handles ESC/outside click
  // Module-level singleton shared across hook instances
  const stack = (globalThis as any).__modalStack__ as HTMLDivElement[] | undefined
  const modalStack: HTMLDivElement[] = stack ?? ((globalThis as any).__modalStack__ = [])

  useEffect(() => {
    const node = modalRef.current
    
    // Register this modal in the stack when open and ref is ready
    if (isOpen && node) {
      if (!modalStack.includes(node)) {
        modalStack.push(node)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (!closeOnEscape || event.key !== 'Escape' || !isOpen) return
      const top = modalStack[modalStack.length - 1]
      if (top && node === top) onClose()
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!closeOnOutsideClick || !isOpen || !node) return
      
      const target = event.target as Node
      const top = modalStack[modalStack.length - 1]
      
      // 1. Verifica se este é o modal do topo
      if (node !== top) return
      
      // 2. Verifica se o clique foi fora do conteúdo principal do modal (node)
      const isOutside = !node.contains(target)
      
      // 3. Verifica se o clique ocorreu dentro de algum outro modal na pilha (para evitar fechar o modal B ao clicar no modal A)
      const clickedInsideAnotherModal = modalStack.some(
        (m) => m !== node && m.contains(target)
      )
      
      // Se o clique foi fora do modal atual E não foi dentro de um modal subjacente, fecha.
      // Se o clique foi dentro de um modal subjacente, o clique deve ser ignorado pelo modal superior.
      if (isOutside && !clickedInsideAnotherModal) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('mousedown', handleOutsideClick)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      // Unregister this modal from the stack
      const idx = node ? modalStack.indexOf(node) : -1
      if (idx >= 0) modalStack.splice(idx, 1)

      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleOutsideClick)
      
      // Only restore scroll if no other modal is open
      if (modalStack.length === 0) {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen, onClose, closeOnEscape, closeOnOutsideClick])

  return { modalRef }
}