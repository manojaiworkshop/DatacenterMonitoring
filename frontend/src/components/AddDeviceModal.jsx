import { useState } from 'react'
import { X, Monitor, Server, Network, Battery } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const DEVICE_TYPES = [
  { value: 'pc', label: 'PC', icon: Monitor, color: 'text-green-500' },
  { value: 'server', label: 'Server', icon: Server, color: 'text-blue-500' },
  { value: 'switch', label: 'Switch', icon: Network, color: 'text-purple-500' },
  { value: 'ups', label: 'UPS', icon: Battery, color: 'text-yellow-500' },
]

function AddDeviceModal({ isOpen, onClose, onAdd, datacenterId }) {
  const { theme } = useTheme()
  const [formData, setFormData] = useState({
    name: '',
    device_type: 'pc',
    ip_address: '',
    ssh_port: '22',
    ssh_username: '',
    ssh_password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Device name is required')
      return
    }

    setLoading(true)

    try {
      await onAdd({
        ...formData,
        datacenter_id: datacenterId,
        status: 'offline',
      })

      // Reset form
      setFormData({
        name: '',
        device_type: 'pc',
        ip_address: '',
        ssh_port: '22',
        ssh_username: '',
        ssh_password: '',
      })

      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add device')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const selectedType = DEVICE_TYPES.find((t) => t.value === formData.device_type)
  const requiresSSH = formData.device_type === 'pc' || formData.device_type === 'server'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`rounded-lg shadow-xl w-full max-w-md mx-4 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <h2
            className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Add New Device
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg ${
              theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Device Name */}
          <div>
            <label
              className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Device Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Main Server, PC-01"
              className={`w-full px-3 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              required
            />
          </div>

          {/* Device Type */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Device Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEVICE_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = formData.device_type === type.value

                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, device_type: type.value }))
                    }
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                      isSelected
                        ? theme === 'dark'
                          ? 'bg-blue-900 border-blue-600'
                          : 'bg-blue-50 border-blue-500'
                        : theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${type.color}`} />
                    <span
                      className={
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                      }
                    >
                      {type.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* IP Address */}
          <div>
            <label
              className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              IP Address {requiresSSH && '*'}
            </label>
            <input
              type="text"
              name="ip_address"
              value={formData.ip_address}
              onChange={handleChange}
              placeholder="e.g., 192.168.1.100"
              className={`w-full px-3 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              required={requiresSSH}
            />
          </div>

          {/* SSH Configuration (only for PC and Server) */}
          {requiresSSH && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {/* SSH Port */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    SSH Port
                  </label>
                  <input
                    type="number"
                    name="ssh_port"
                    value={formData.ssh_port}
                    onChange={handleChange}
                    placeholder="22"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                {/* SSH Username */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    SSH Username
                  </label>
                  <input
                    type="text"
                    name="ssh_username"
                    value={formData.ssh_username}
                    onChange={handleChange}
                    placeholder="root"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
              </div>

              {/* SSH Password */}
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  SSH Password
                </label>
                <input
                  type="password"
                  name="ssh_password"
                  value={formData.ssh_password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Adding...' : 'Add Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddDeviceModal
