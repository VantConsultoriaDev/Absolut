import React, { createContext, useContext, useState, useEffect } from 'react'
import { ThemeContextType } from '../types'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(false)
  const [isMenuManual, setIsMenuManual] = useState(false) // NOVO ESTADO

  useEffect(() => {
    // Check saved theme preference
    const savedTheme = localStorage.getItem('absolut_theme')
    if (savedTheme === 'dark') {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    }
    
    // Check saved menu preference
    const savedMenuMode = localStorage.getItem('absolut_menu_mode')
    if (savedMenuMode === 'manual') {
        setIsMenuManual(true)
    } else {
        setIsMenuManual(false)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    
    if (newTheme) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('absolut_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('absolut_theme', 'light')
    }
  }
  
  const toggleMenuManual = () => {
    const newMode = !isMenuManual
    setIsMenuManual(newMode)
    
    if (newMode) {
        localStorage.setItem('absolut_menu_mode', 'manual')
    } else {
        localStorage.setItem('absolut_menu_mode', 'auto')
    }
  }

  const value: ThemeContextType = {
    isDark,
    toggleTheme,
    isMenuManual, // EXPORTADO
    toggleMenuManual // EXPORTADO
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}