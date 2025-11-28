import { useState, useEffect } from 'react'
import { RefreshCw, AlertCircle, XCircle, StopCircle, Search } from 'lucide-react'
import axios from 'axios'

function ProcessesTab({ device, theme }) {
  const [processes, setProcesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState({})
  const [sortBy, setSortBy] = useState('cpu') // 'cpu' or 'memory'
  const [searchQuery, setSearchQuery] = useState('')

  const loadProcesses = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/devices/${device.id}/processes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setProcesses(response.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load processes:', err)
      setError(err.response?.data?.detail || 'Failed to load processes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProcesses()
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadProcesses, 5000)
    return () => clearInterval(interval)
  }, [device.id])

  const handleProcessAction = async (pid, action) => {
    if (!confirm(`Are you sure you want to ${action} process ${pid}?`)) {
      return
    }

    const key = `${pid}-${action}`
    setActionLoading({ ...actionLoading, [key]: true })

    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `/api/devices/${device.id}/processes/${pid}/${action}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      
      // Reload processes after action
      setTimeout(() => {
        loadProcesses()
      }, 1000)
    } catch (err) {
      console.error(`Failed to ${action} process:`, err)
      alert(`Failed to ${action} process: ${err.response?.data?.detail || err.message}`)
    } finally {
      setActionLoading({ ...actionLoading, [key]: false })
    }
  }

  // Filter processes based on search query
  const filteredProcesses = processes.filter((process) =>
    process.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
    process.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    process.pid.toString().includes(searchQuery)
  )

  const sortedProcesses = [...filteredProcesses].sort((a, b) => {
    if (sortBy === 'cpu') return b.cpu - a.cpu
    if (sortBy === 'memory') return b.memory - a.memory
    return 0
  })

  if (loading && processes.length === 0) {
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
          <p className="text-red-500 mb-2">Failed to load processes</p>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {error}
          </p>
          <button
            onClick={loadProcesses}
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
        <div className="flex items-center space-x-4">
          <span className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {sortedProcesses.length} / {processes.length} processes
          </span>
          
          <div className="flex items-center space-x-2">
            <span className={`text-xs ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
            }`}>
              Sort by:
            </span>
            <button
              onClick={() => setSortBy('cpu')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                sortBy === 'cpu'
                  ? 'bg-blue-500 text-white'
                  : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              CPU
            </button>
            <button
              onClick={() => setSortBy('memory')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                sortBy === 'memory'
                  ? 'bg-blue-500 text-white'
                  : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Memory
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2" style={{ width: '30%' }}>
          <div className={`flex items-center flex-1 px-3 py-1.5 rounded-lg border ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600'
              : 'bg-white border-gray-300'
          }`}>
            <Search className={`w-4 h-4 mr-2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search processes..."
              className={`flex-1 bg-transparent outline-none text-sm ${
                theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>
          <button
            onClick={loadProcesses}
            disabled={loading}
            className={`p-1.5 rounded transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400'
                : 'hover:bg-gray-100 text-gray-600'
            } disabled:opacity-50`}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Processes Table */}
      <div className="overflow-auto" style={{ height: '50vh' }}>
        <table className="w-full text-sm">
          <thead className={`sticky top-0 ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
            <tr className={`text-xs font-medium ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <th className="px-4 py-2 text-left w-20">PID</th>
              <th className="px-4 py-2 text-left w-24">User</th>
              <th className="px-4 py-2 text-right w-20">CPU %</th>
              <th className="px-4 py-2 text-right w-20">RAM %</th>
              <th className="px-4 py-2 text-left">Command</th>
              <th className="px-4 py-2 text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedProcesses.map((process, index) => (
              <tr
                key={`${process.pid}-${index}`}
                className={`border-b ${
                  theme === 'dark'
                    ? 'border-gray-700 hover:bg-gray-700/50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <td className={`px-4 py-2 font-mono ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {process.pid}
                </td>
                <td className={`px-4 py-2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {process.user}
                </td>
                <td className={`px-4 py-2 text-right font-mono ${
                  process.cpu > 50
                    ? 'text-red-500'
                    : process.cpu > 20
                    ? 'text-yellow-500'
                    : theme === 'dark'
                    ? 'text-gray-300'
                    : 'text-gray-700'
                }`}>
                  {process.cpu.toFixed(1)}
                </td>
                <td className={`px-4 py-2 text-right font-mono ${
                  process.memory > 10
                    ? 'text-red-500'
                    : process.memory > 5
                    ? 'text-yellow-500'
                    : theme === 'dark'
                    ? 'text-gray-300'
                    : 'text-gray-700'
                }`}>
                  {process.memory.toFixed(1)}
                </td>
                <td className={`px-4 py-2 font-mono text-xs truncate max-w-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {process.command}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <button
                      onClick={() => handleProcessAction(process.pid, 'stop')}
                      disabled={actionLoading[`${process.pid}-stop`]}
                      className="p-1 rounded transition-colors hover:bg-yellow-500/20 text-yellow-500 disabled:opacity-50"
                      title="Stop (SIGTERM)"
                    >
                      <StopCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleProcessAction(process.pid, 'kill')}
                      disabled={actionLoading[`${process.pid}-kill`]}
                      className="p-1 rounded transition-colors hover:bg-red-500/20 text-red-500 disabled:opacity-50"
                      title="Kill (SIGKILL)"
                    >
                      <XCircle className="w-4 h-4" />
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

export default ProcessesTab
