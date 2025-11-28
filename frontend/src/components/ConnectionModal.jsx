import { useState } from 'react'
import { X, Monitor, Server } from 'lucide-react'

function ConnectionModal({ isOpen, onClose, onConnect }) {
  const [connectionType, setConnectionType] = useState('local')
  const [sshConfig, setSshConfig] = useState({
    host: '',
    port: '22',
    username: '',
    password: '',
  })
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (connectionType === 'ssh') {
      // Validate SSH fields
      if (!sshConfig.host || !sshConfig.username || !sshConfig.password) {
        setError('Please fill in all required fields')
        return
      }
    }

    // Connect with configuration
    onConnect(connectionType === 'ssh' ? {
      host: sshConfig.host,
      port: parseInt(sshConfig.port),
      username: sshConfig.username,
      password: sshConfig.password,
    } : null)

    // Reset and close
    setSshConfig({ host: '', port: '22', username: '', password: '' })
    setConnectionType('local')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">New Terminal Connection</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Connection Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Connection Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setConnectionType('local')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                  connectionType === 'local'
                    ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <Monitor className={`w-8 h-8 mb-2 ${
                  connectionType === 'local' ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <span className={`text-sm font-medium ${
                  connectionType === 'local' ? 'text-blue-500' : 'text-gray-300'
                }`}>
                  Local Terminal
                </span>
              </button>

              <button
                type="button"
                onClick={() => setConnectionType('ssh')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                  connectionType === 'ssh'
                    ? 'border-green-500 bg-green-500 bg-opacity-10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <Server className={`w-8 h-8 mb-2 ${
                  connectionType === 'ssh' ? 'text-green-500' : 'text-gray-400'
                }`} />
                <span className={`text-sm font-medium ${
                  connectionType === 'ssh' ? 'text-green-500' : 'text-gray-300'
                }`}>
                  SSH Connection
                </span>
              </button>
            </div>
          </div>

          {/* SSH Configuration Fields */}
          {connectionType === 'ssh' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Host / IP Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sshConfig.host}
                  onChange={(e) => setSshConfig({ ...sshConfig, host: e.target.value })}
                  placeholder="192.168.1.100"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Port
                </label>
                <input
                  type="number"
                  value={sshConfig.port}
                  onChange={(e) => setSshConfig({ ...sshConfig, port: e.target.value })}
                  placeholder="22"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sshConfig.username}
                  onChange={(e) => setSshConfig({ ...sshConfig, username: e.target.value })}
                  placeholder="root"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={sshConfig.password}
                  onChange={(e) => setSshConfig({ ...sshConfig, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ConnectionModal
