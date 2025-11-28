import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import DatacenterPanel from '../components/DatacenterPanel'
import { authService } from '../services/authService'
import { datacenterService } from '../services/datacenterService'
import { LogOut, Settings, Plus } from 'lucide-react'
import SettingsDrawer from '../components/SettingsDrawer'
import { useTheme } from '../context/ThemeContext'
import AddDatacenterModal from '../components/AddDatacenterModal'

function DatacenterMonitorPage() {
  const [socket, setSocket] = useState(null)
  const [datacenters, setDatacenters] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { theme } = useTheme()

  useEffect(() => {
    // Connect to Socket.IO
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

    // Listen for device status updates
    newSocket.on('device_status_update', (data) => {
      console.log('Device status update:', data)
      // Update the device status in the state
      setDatacenters((prevDatacenters) => 
        prevDatacenters.map((dc) => {
          if (dc.id === data.datacenter_id) {
            return {
              ...dc,
              devices: dc.devices.map((device) =>
                device.id === data.device_id
                  ? { ...device, status: data.status }
                  : device
              ),
            }
          }
          return dc
        })
      )
    })

    setSocket(newSocket)

    // Load datacenters
    loadDatacenters()

    return () => {
      newSocket.close()
    }
  }, [])

  const loadDatacenters = async () => {
    try {
      setLoading(true)
      const data = await datacenterService.getDatacenters()
      setDatacenters(data)
    } catch (error) {
      console.error('Failed to load datacenters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDatacenter = async (datacenterData) => {
    console.log('Page: handleAddDatacenter called with:', datacenterData)
    try {
      const result = await datacenterService.createDatacenter(datacenterData)
      console.log('Page: Datacenter created, result:', result)
      await loadDatacenters()
      console.log('Page: Datacenters reloaded')
    } catch (error) {
      console.error('Page: Error in handleAddDatacenter:', error)
      throw error
    }
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
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">DC</span>
          </div>
          <h1 className={`text-2xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            Datacenter Monitor
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Datacenter</span>
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
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

      {/* Datacenter Panels - Side by Side */}
      <div className="flex-1 p-4 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Loading datacenters...
              </p>
            </div>
          </div>
        ) : datacenters.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className={`text-6xl mb-4 ${
                theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
              }`}>
                🏢
              </div>
              <h2 className={`text-2xl font-semibold mb-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No Datacenters Yet
              </h2>
              <p className={`mb-6 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Click "Add Datacenter" to create your first datacenter
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Add Datacenter</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={`grid h-full gap-4 ${
            datacenters.length === 1 
              ? 'grid-cols-1' 
              : 'grid-cols-2'
          }`}>
            {datacenters.slice(0, 2).map((datacenter) => (
              <DatacenterPanel
                key={datacenter.id}
                datacenter={datacenter}
                socket={socket}
                onUpdate={loadDatacenters}
              />
            ))}
          </div>
        )}
      </div>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Add Datacenter Modal */}
      <AddDatacenterModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddDatacenter}
      />
    </div>
  )
}

export default DatacenterMonitorPage
