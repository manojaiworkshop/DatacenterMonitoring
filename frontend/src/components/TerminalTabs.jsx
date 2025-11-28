import { useEffect, useRef } from 'react'
import { Terminal as TerminalIcon, X } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useTheme } from '../context/ThemeContext'

function TerminalTabs({ activeTerminals, activeTab, onTabChange, onCloseTerminal, socket }) {
  const { theme } = useTheme()
  const terminalRefs = useRef({})
  const fitAddons = useRef({})

  useEffect(() => {
    // Initialize terminals for each device
    activeTerminals.forEach((terminal) => {
      if (!terminalRefs.current[terminal.device.id]) {
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

        terminalRefs.current[terminal.device.id] = term
        fitAddons.current[terminal.device.id] = fitAddon

        // Mount terminal
        const container = document.getElementById(`terminal-${terminal.device.id}`)
        if (container) {
          term.open(container)
          fitAddon.fit()

          // Handle terminal input
          term.onData((data) => {
            socket.emit('terminal_input', {
              session_id: terminal.sessionId,
              data: data,
            })
          })

          // Request PTY resize
          socket.emit('terminal_resize', {
            session_id: terminal.sessionId,
            rows: term.rows,
            cols: term.cols,
          })
        }
      }
    })

    // Listen for terminal output
    const handleOutput = (data) => {
      const term = terminalRefs.current[data.device_id]
      if (term) {
        term.write(data.data)
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

  // Fit terminal when tab changes
  useEffect(() => {
    if (activeTab && fitAddons.current[activeTab]) {
      setTimeout(() => {
        fitAddons.current[activeTab].fit()
      }, 100)
    }
  }, [activeTab])

  if (activeTerminals.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className={`flex items-center space-x-1 border-b ${
        theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}>
        {activeTerminals.map((terminal) => (
          <div
            key={terminal.device.id}
            onClick={() => onTabChange(terminal.device.id)}
            className={`flex items-center space-x-2 px-3 py-2 cursor-pointer text-sm ${
              activeTab === terminal.device.id
                ? theme === 'dark'
                  ? 'bg-gray-900 border-b-2 border-blue-500 text-white'
                  : 'bg-white border-b-2 border-blue-500 text-gray-900'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <TerminalIcon className="w-4 h-4" />
            <span className="max-w-[120px] truncate">{terminal.device.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCloseTerminal(terminal.device.id)
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
            key={terminal.device.id}
            id={`terminal-${terminal.device.id}`}
            className={`h-full ${
              activeTab === terminal.device.id ? 'block' : 'hidden'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default TerminalTabs
