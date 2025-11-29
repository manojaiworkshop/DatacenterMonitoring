import { useState, useEffect, useRef } from 'react'
import { X, Maximize2, Minimize2, Terminal as TerminalIcon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import Terminal from './Terminal'

function FloatingTerminal({ terminal, socket, onClose, position = 'left', zIndex = 10 }) {
  const { theme } = useTheme()
  const [isMaximized, setIsMaximized] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [windowPosition, setWindowPosition] = useState({ x: 20, y: 20 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const windowRef = useRef(null)

  // Set initial position based on left/right
  useEffect(() => {
    if (position === 'left') {
      setWindowPosition({ x: 20, y: window.innerHeight - 400 })
    } else {
      setWindowPosition({ x: window.innerWidth - 620, y: window.innerHeight - 400 })
    }
  }, [position])

  const handleMouseDown = (e) => {
    if (e.target.closest('.terminal-header') && !e.target.closest('button')) {
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - windowPosition.x,
        y: e.clientY - windowPosition.y
      })
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging && !isMaximized) {
      setWindowPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
    setIsMinimized(false)
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          [position]: '20px',
          zIndex: zIndex + 1000
        }}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg cursor-pointer transition-all hover:scale-105 ${
          theme === 'dark'
            ? 'bg-slate-800 border border-blue-500/30'
            : 'bg-white border border-blue-300'
        }`}
        onClick={toggleMinimize}
      >
        <TerminalIcon className="w-5 h-5 text-blue-500" />
        <span className={`text-sm font-medium ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>
          {terminal.title}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="text-red-500 hover:text-red-600 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      ref={windowRef}
      style={{
        position: 'fixed',
        left: isMaximized ? 0 : `${windowPosition.x}px`,
        top: isMaximized ? 0 : `${windowPosition.y}px`,
        width: isMaximized ? '100%' : '600px',
        height: isMaximized ? '100%' : '350px',
        zIndex: zIndex + 1000,
        transition: isMaximized ? 'all 0.3s ease' : 'none'
      }}
      className={`flex flex-col rounded-lg shadow-2xl overflow-hidden ${
        theme === 'dark'
          ? 'bg-slate-900 border border-blue-500/30'
          : 'bg-white border border-blue-300'
      }`}
      onMouseDown={handleMouseDown}
    >
      {/* Terminal Header */}
      <div
        className={`terminal-header px-4 py-2 flex items-center justify-between cursor-move select-none ${
          theme === 'dark'
            ? 'bg-slate-800 border-b border-blue-500/20'
            : 'bg-blue-50 border-b border-blue-200'
        }`}
      >
        <div className="flex items-center space-x-2">
          <TerminalIcon className="w-4 h-4 text-blue-500" />
          <span className={`text-sm font-medium ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            {terminal.title}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Minimize Button */}
          <button
            onClick={toggleMinimize}
            className={`p-1.5 rounded transition-colors ${
              theme === 'dark'
                ? 'hover:bg-slate-700 text-gray-400'
                : 'hover:bg-blue-100 text-gray-600'
            }`}
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          
          {/* Maximize Button */}
          <button
            onClick={toggleMaximize}
            className={`p-1.5 rounded transition-colors ${
              theme === 'dark'
                ? 'hover:bg-slate-700 text-gray-400'
                : 'hover:bg-blue-100 text-gray-600'
            }`}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className={`p-1.5 rounded transition-colors ${
              theme === 'dark'
                ? 'hover:bg-red-600/20 text-red-400'
                : 'hover:bg-red-100 text-red-600'
            }`}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden">
        <Terminal
          socket={socket}
          terminalId={terminal.id}
          onClose={onClose}
          title={terminal.title}
        />
      </div>
    </div>
  )
}

export default FloatingTerminal
