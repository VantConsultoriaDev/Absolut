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
    // Register this modal in the stack when open and ref is ready
    if (isOpen && modalRef.current) {
      const node = modalRef.current
      if (!modalStack.includes(node)) {
        modalStack.push(node)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (!closeOnEscape || event.key !== 'Escape' || !isOpen) return
      const top = modalStack[modalStack.length - 1]
      if (top && modalRef.current === top) onClose()
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!closeOnOutsideClick || !isOpen || !modalRef.current) return
      const target = event.target as Node
      const isOutside = !modalRef.current.contains(target)
      const top = modalStack[modalStack.length - 1]
      if (isOutside && top && modalRef.current === top) onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('mousedown', handleOutsideClick)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      // Unregister this modal from the stack
      const node = modalRef.current
      const idx = node ? modalStack.indexOf(node) : -1
      if (idx >= 0) modalStack.splice(idx, 1)

      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleOutsideClick)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, closeOnEscape, closeOnOutsideClick])

  return { modalRef }
}