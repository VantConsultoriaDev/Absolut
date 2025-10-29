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

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        closeOnOutsideClick &&
        isOpen &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
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
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleOutsideClick)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, closeOnEscape, closeOnOutsideClick])

  return { modalRef }
}