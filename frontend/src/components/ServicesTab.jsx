import { useState, useEffect } from 'react'
import { Play, Square, RotateCw, RefreshCw, AlertCircle } from 'lucide-react'
import axios from 'axios'

function ServicesTab({ device, theme }) {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState({})

  const loadServices = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/devices/${device.id}/services`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setServices(response.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load services:', err)
      setError(err.response?.data?.detail || 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [device.id])

  const handleServiceAction = async (serviceName, action) => {
    const key = `${serviceName}-${action}`
    setActionLoading({ ...actionLoading, [key]: true })

    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `/api/devices/${device.id}/services/${serviceName}/${action}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      // Reload services after action
      setTimeout(() => {
        loadServices()
      }, 1000)
    } catch (err) {
      console.error(`Failed to ${action} service:`, err)
      alert(`Failed to ${action} service: ${err.response?.data?.detail || err.message}`)
    } finally {
      setActionLoading({ ...actionLoading, [key]: false })
    }
  }

  const getStatusColor = (active, sub) => {
    if (active === 'active' && sub === 'running') return 'text-green-500'
    if (active === 'failed') return 'text-red-500'
    if (active === 'inactive') return 'text-gray-500'
    return 'text-yellow-500'
  }

  const getStatusBadge = (active, sub) => {
    const color = getStatusColor(active, sub)
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
        active === 'active' && sub === 'running'
          ? 'bg-green-500/20 text-green-500'
          : active === 'failed'
          ? 'bg-red-500/20 text-red-500'
          : active === 'inactive'
          ? 'bg-gray-500/20 text-gray-500'
          : 'bg-yellow-500/20 text-yellow-500'
      }`}>
        {active} / {sub}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className={`w-8 h-8 animate-spin ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-500 mb-2">Failed to load services</p>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {error}
          </p>
          <button
            onClick={loadServices}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className={`px-4 py-2 border-b flex items-center justify-between ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <span className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {services.length} services
        </span>
        <button
          onClick={loadServices}
          className={`p-1 rounded transition-colors ${
            theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-400'
              : 'hover:bg-gray-100 text-gray-600'
          }`}
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Services Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className={`sticky top-0 ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
            <tr className={`text-xs font-medium ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <th className="px-4 py-2 text-left">Service Name</th>
              <th className="px-4 py-2 text-left">Load</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service, index) => (
              <tr
                key={index}
                className={`border-b ${
                  theme === 'dark'
                    ? 'border-gray-700 hover:bg-gray-700/50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <td className={`px-4 py-3 text-sm ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  {service.name}
                </td>
                <td className={`px-4 py-3 text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {service.load}
                </td>
                <td className="px-4 py-3 text-sm">
                  {getStatusBadge(service.active, service.sub)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleServiceAction(service.name, 'start')}
                      disabled={actionLoading[`${service.name}-start`]}
                      className="p-1 rounded transition-colors hover:bg-green-500/20 text-green-500 disabled:opacity-50"
                      title="Start"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleServiceAction(service.name, 'stop')}
                      disabled={actionLoading[`${service.name}-stop`]}
                      className="p-1 rounded transition-colors hover:bg-red-500/20 text-red-500 disabled:opacity-50"
                      title="Stop"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleServiceAction(service.name, 'restart')}
                      disabled={actionLoading[`${service.name}-restart`]}
                      className="p-1 rounded transition-colors hover:bg-blue-500/20 text-blue-500 disabled:opacity-50"
                      title="Restart"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ServicesTab
