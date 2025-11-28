import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useTheme } from '../context/ThemeContext'
import '@xterm/xterm/css/xterm.css'

function TerminalComponent({ socket, terminalId, onClose, title }) {
  const terminalRef = useRef(null)
  const xtermRef = useRef(null)
  const fitAddonRef = useRef(null)
  const { theme } = useTheme()

  // Define theme colors
  const darkTheme = {
    background: '#1e1e1e',
    foreground: '#ffffff',
    cursor: '#ffffff',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#ffffff',
  }

  const lightTheme = {
    background: '#ffffff',
    foreground: '#000000',
    cursor: '#000000',
    black: '#000000',
    red: '#cd3131',
    green: '#00bc00',
    yellow: '#949800',
    blue: '#0451a5',
    magenta: '#bc05bc',
    cyan: '#0598bc',
    white: '#555555',
    brightBlack: '#666666',
    brightRed: '#cd3131',
    brightGreen: '#14ce14',
    brightYellow: '#b5ba00',
    brightBlue: '#0451a5',
    brightMagenta: '#bc05bc',
    brightCyan: '#0598bc',
    brightWhite: '#a5a5a5',
  }

  useEffect(() => {
    if (!terminalRef.current || !socket) return

    // Create xterm instance with theme
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: theme === 'dark' ? darkTheme : lightTheme,
      scrollback: 1000,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Handle terminal input
    term.onData((data) => {
      if (socket && terminalId) {
        socket.emit('terminal_input', {
          terminal_id: terminalId,
          data: data,
        })
      }
    })

    // Handle terminal output
    const handleOutput = (data) => {
      if (data.terminal_id === terminalId) {
        term.write(data.data)
      }
    }

    socket.on('terminal_output', handleOutput)

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit()
      if (socket && terminalId) {
        socket.emit('terminal_resize', {
          terminal_id: terminalId,
          cols: term.cols,
          rows: term.rows,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      socket.off('terminal_output', handleOutput)
      term.dispose()
    }
  }, [socket, terminalId])

  // Update terminal theme when app theme changes
  useEffect(() => {
    if (xtermRef.current) {
      const currentTheme = theme === 'dark' ? darkTheme : lightTheme
      xtermRef.current.options.theme = currentTheme
    }
  }, [theme])

  return (
    <div className={`flex flex-col h-full rounded-lg overflow-hidden border ${
      theme === 'dark' 
        ? 'bg-gray-900 border-gray-700' 
        : 'bg-white border-gray-300'
    }`}>
      <div className={`px-4 py-2 flex items-center justify-between border-b ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-gray-100 border-gray-300'
      }`}>
        <span className={`text-sm font-medium ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>{title}</span>
        <button
          onClick={onClose}
          className={`transition-colors ${
            theme === 'dark'
              ? 'text-gray-400 hover:text-red-500'
              : 'text-gray-600 hover:text-red-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  )
}

export default TerminalComponent
