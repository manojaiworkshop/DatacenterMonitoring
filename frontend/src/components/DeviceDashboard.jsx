import { useState, useEffect } from 'react'
import { X, Activity, HardDrive, Cpu, RefreshCw } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import SystemMetrics from './SystemMetrics'
import ServicesTab from './ServicesTab'
import ProcessesTab from './ProcessesTab'

function DeviceDashboard({ device, socket, onClose }) {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState('services')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!socket || !device) return

    // Start monitoring
    socket.emit('start_device_monitoring', {
      device_id: device.id,
      host: device.ip_address,
      port: device.ssh_port || 22,
      username: device.ssh_username,
      password: device.ssh_password,
    })

    // Listen for stats updates
    const handleStatsUpdate = (data) => {
      if (data.device_id === device.id) {
        setStats(data.stats)
        setLoading(false)
        setError(null)
      }
    }

    const handleError = (data) => {
      if (data.device_id === device.id) {
        setError(data.error)
        setLoading(false)
      }
    }

    socket.on('device_stats_update', handleStatsUpdate)
    socket.on('device_monitoring_error', handleError)

    return () => {
      socket.off('device_stats_update', handleStatsUpdate)
      socket.off('device_monitoring_error', handleError)
      
      // Stop monitoring when component unmounts
      socket.emit('stop_device_monitoring', {
        device_id: device.id,
      })
    }
  }, [socket, device])

  return (
    <div className={`flex flex-col h-full ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
    } rounded-lg border ${
      theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        theme === 'dark'
          ? 'bg-gray-900 border-gray-700'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          <Activity className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              {device.name}
            </h2>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {device.ip_address}
            </p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className={`p-2 rounded-lg transition-colors ${
            theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-400'
              : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* System Metrics - Top Half */}
      <div className={`border-b ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`} />
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Loading device statistics...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500 mb-2">Failed to connect to device</p>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {error}
            </p>
          </div>
        ) : (
          <SystemMetrics stats={stats} theme={theme} />
        )}
      </div>

      {/* Tabs - Bottom Half */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Headers */}
        <div className={`flex border-b ${
          theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
        }`}>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'services'
                ? theme === 'dark'
                  ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400'
                  : 'bg-white text-blue-600 border-b-2 border-blue-600'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Services
          </button>
          <button
            onClick={() => setActiveTab('processes')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'processes'
                ? theme === 'dark'
                  ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400'
                  : 'bg-white text-blue-600 border-b-2 border-blue-600'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Processes
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'services' && (
            <ServicesTab device={device} theme={theme} />
          )}
          {activeTab === 'processes' && (
            <ProcessesTab device={device} theme={theme} />
          )}
        </div>
      </div>
    </div>
  )
}

export default DeviceDashboard
