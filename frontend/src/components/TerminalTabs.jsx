import { useEffect, useRef, useState } from 'react'
import { Terminal as TerminalIcon, X, GripHorizontal } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useTheme } from '../context/ThemeContext'

function TerminalTabs({ activeTerminals, activeTab, onTabChange, onCloseTerminal, socket, onHeightChange }) {
  const { theme } = useTheme()
  const terminalRefs = useRef({})  // Store by terminal ID
  const fitAddons = useRef({})     // Store by terminal ID
  const [isDragging, setIsDragging] = useState(false)
  const [terminalHeight, setTerminalHeight] = useState(20) // Default 20%

  useEffect(() => {
    // Initialize terminals for each terminal session
    activeTerminals.forEach((terminal) => {
      const termId = terminal.id  // Use terminal session ID as key
      
      if (!terminalRefs.current[termId]) {
        console.log('Creating terminal for session:', termId, terminal)
        
        const term = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Consolas, "Courier New", monospace',
          theme: {
            background: theme === 'dark' ? '#1e293b' : '#ffffff',
            foreground: theme === 'dark' ? '#e2e8f0' : '#1e293b',
            cursor: theme === 'dark' ? '#60a5fa' : '#3b82f6',
          },
        })

        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)

        terminalRefs.current[termId] = term
        fitAddons.current[termId] = fitAddon

        // Mount terminal
        const container = document.getElementById(`terminal-${termId}`)
        if (container) {
          term.open(container)
          
          // Fit terminal to container
          setTimeout(() => {
            fitAddon.fit()
          }, 100)

          // Handle terminal input - send to backend
          term.onData((data) => {
            console.log('Terminal input:', termId, data)
            socket.emit('terminal_input', {
              terminal_id: termId,
              data: data,
            })
          })

          // Request PTY resize after fitting
          setTimeout(() => {
            socket.emit('terminal_resize', {
              terminal_id: termId,
              rows: term.rows,
              cols: term.cols,
            })
          }, 150)
        }
      }
    })

    // Listen for terminal output
    const handleOutput = (data) => {
      console.log('Terminal output received:', data)
      const termId = data.terminal_id
      const term = terminalRefs.current[termId]
      
      if (term) {
        term.write(data.data)
      } else {
        console.warn('Terminal not found for output:', termId)
      }
    }

    socket.on('terminal_output', handleOutput)

    return () => {
      socket.off('terminal_output', handleOutput)
    }
  }, [activeTerminals, socket, theme])

  // Update terminal theme when theme changes
  useEffect(() => {
    Object.values(terminalRefs.current).forEach((term) => {
      term.options.theme = {
        background: theme === 'dark' ? '#1e293b' : '#ffffff',
        foreground: theme === 'dark' ? '#e2e8f0' : '#1e293b',
        cursor: theme === 'dark' ? '#60a5fa' : '#3b82f6',
      }
    })
  }, [theme])

  // Cleanup terminals on unmount
  useEffect(() => {
    return () => {
      Object.values(terminalRefs.current).forEach((term) => {
        term.dispose()
      })
      terminalRefs.current = {}
      fitAddons.current = {}
    }
  }, [])

  // Fit terminal when tab changes or height changes
  useEffect(() => {
    if (activeTab && fitAddons.current[activeTab]) {
      setTimeout(() => {
        fitAddons.current[activeTab].fit()
      }, 100)
    }
  }, [activeTab, terminalHeight])

  // Handle resize drag
  const handleMouseDown = (e) => {
    setIsDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      const windowHeight = window.innerHeight
      const mouseY = e.clientY
      const headerHeight = 80 // Approximate header height
      const availableHeight = windowHeight - headerHeight
      const newHeight = ((windowHeight - mouseY) / availableHeight) * 100
      
      // Constrain between 15% and 60%
      const constrainedHeight = Math.min(Math.max(newHeight, 15), 60)
      setTerminalHeight(constrainedHeight)
      
      // Refit all terminals after resize
      Object.values(fitAddons.current).forEach(addon => {
        if (addon) {
          setTimeout(() => addon.fit(), 50)
        }
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (activeTerminals.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`flex items-center justify-center cursor-ns-resize h-2 ${
          theme === 'dark' 
            ? 'bg-gray-700 hover:bg-gray-600' 
            : 'bg-gray-200 hover:bg-gray-300'
        } transition-colors ${isDragging ? 'bg-blue-500' : ''}`}
      >
        <GripHorizontal className={`w-8 h-4 ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        }`} />
      </div>

      {/* Tabs */}
      <div className={`flex items-center space-x-1 border-b ${
        theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}>
        {activeTerminals.map((terminal) => (
          <div
            key={terminal.id}
            onClick={() => onTabChange(terminal.deviceId)}
            className={`flex items-center space-x-2 px-3 py-2 cursor-pointer text-sm ${
              activeTab === terminal.deviceId
                ? theme === 'dark'
                  ? 'bg-gray-900 border-b-2 border-blue-500 text-white'
                  : 'bg-white border-b-2 border-blue-500 text-gray-900'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <TerminalIcon className="w-4 h-4" />
            <span className="max-w-[120px] truncate">{terminal.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCloseTerminal(terminal.id)
              }}
              className={`p-0.5 rounded hover:bg-opacity-20 ${
                theme === 'dark' ? 'hover:bg-white' : 'hover:bg-black'
              }`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {activeTerminals.length >= 3 && (
          <div className={`px-3 py-2 text-xs italic ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`}>
            (Max 3 terminals)
          </div>
        )}
      </div>

      {/* Terminal Content */}
      <div className={`flex-1 overflow-hidden ${
        theme === 'dark' ? 'bg-slate-800' : 'bg-white'
      }`}>
        {activeTerminals.map((terminal) => (
          <div
            key={terminal.id}
            id={`terminal-${terminal.id}`}
            className={`h-full ${
              activeTab === terminal.deviceId ? 'block' : 'hidden'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default TerminalTabs
