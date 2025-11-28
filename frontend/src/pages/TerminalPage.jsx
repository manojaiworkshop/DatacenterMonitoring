import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import Terminal from '../components/Terminal'
import ConnectionModal from '../components/ConnectionModal'
import SettingsDrawer from '../components/SettingsDrawer'
import { authService } from '../services/authService'
import { Plus, LogOut, Monitor, Settings } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function TerminalPage() {
  const [socket, setSocket] = useState(null)
  const [terminals, setTerminals] = useState([])
  const [showConnectionModal, setShowConnectionModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const navigate = useNavigate()
  const { theme } = useTheme()

  useEffect(() => {
    // Connect to Socket.IO server through Nginx proxy
    const newSocket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
    })

    newSocket.on('connect', () => {
      console.log('Connected to server')
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
    })

    newSocket.on('terminal_created', (data) => {
      console.log('Terminal created:', data)
    })

    newSocket.on('terminal_closed', (data) => {
      setTerminals((prev) => prev.filter((t) => t.id !== data.terminal_id))
    })

    newSocket.on('error', (data) => {
      console.error('Socket error:', data)
      alert(data.message)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  const createTerminal = (sshConfig = null) => {
    if (!socket) return

    const payload = {
      cols: 80,
      rows: 24,
    }

    // Add SSH configuration if provided
    if (sshConfig) {
      payload.ssh_config = sshConfig
    }
    
    socket.emit('create_terminal', payload)

    socket.once('terminal_created', (data) => {
      const terminalType = data.is_ssh ? `SSH: ${data.host}` : 'Local'
      setTerminals((prev) => [
        ...prev,
        {
          id: data.terminal_id,
          title: `${terminalType} - Terminal ${prev.length + 1}`,
          is_ssh: data.is_ssh,
          host: data.host,
        },
      ])
    })
  }

  const handleNewTerminal = () => {
    // Limit to 2 terminals (side-by-side)
    if (terminals.length >= 2) {
      alert('Maximum 2 terminals allowed for side-by-side view')
      return
    }
    setShowConnectionModal(true)
  }

  const handleConnect = (sshConfig) => {
    createTerminal(sshConfig)
  }

  const closeTerminal = (terminalId) => {
    if (!socket) return

    socket.emit('close_terminal', {
      terminal_id: terminalId,
    })

    setTerminals((prev) => prev.filter((t) => t.id !== terminalId))
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  return (
    <div className={`h-screen flex flex-col ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 flex items-center justify-between ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          <Monitor className="w-8 h-8 text-blue-500" />
          <h1 className={`text-2xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>Dual Terminal App</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`text-sm mr-4 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {terminals.length}/2 terminals
          </div>
          <button
            onClick={handleNewTerminal}
            disabled={terminals.length >= 2}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              terminals.length >= 2
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span>New Terminal</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Terminal Grid */}
      <div className="flex-1 p-4 overflow-hidden">
        {terminals.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Monitor className={`w-20 h-20 mx-auto mb-4 ${
                theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <h2 className={`text-2xl font-semibold mb-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No Terminals Open
              </h2>
              <p className={`mb-6 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Click "New Terminal" to create your first terminal
              </p>
              <button
                onClick={handleNewTerminal}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Create Terminal</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={`grid h-full gap-4 ${
            terminals.length === 1 
              ? 'grid-cols-1' 
              : 'grid-cols-2'
          }`}>
            {terminals.map((terminal) => (
              <Terminal
                key={terminal.id}
                socket={socket}
                terminalId={terminal.id}
                title={terminal.title}
                onClose={() => closeTerminal(terminal.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnect={handleConnect}
      />

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}

export default TerminalPage
