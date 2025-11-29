import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import DatacenterPanel from '../components/DatacenterPanel'
import DeviceDashboard from '../components/DeviceDashboard'
import { authService } from '../services/authService'
import { datacenterService } from '../services/datacenterService'
import { LogOut, Settings, Plus, Server, Building2, Activity, Terminal } from 'lucide-react'
import SettingsDrawer from '../components/SettingsDrawer'
import { useTheme } from '../context/ThemeContext'
import AddDatacenterModal from '../components/AddDatacenterModal'

function DatacenterMonitorPage() {
  const [socket, setSocket] = useState(null)
  const [datacenters, setDatacenters] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [selectedDatacenterId, setSelectedDatacenterId] = useState(null)
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

  const handleDeviceClick = (device, datacenterId) => {
    setSelectedDevice(device)
    setSelectedDatacenterId(datacenterId)
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  return (
    <div className={`h-screen flex flex-col ${
      theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50'
    }`}>
      {/* Professional Header with Gradient */}
      <div className={`border-b backdrop-blur-sm shadow-lg ${
        theme === 'dark' 
          ? 'bg-slate-800/95 border-blue-500/20' 
          : 'bg-white/95 border-blue-200'
      }`}>
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl blur-md opacity-75 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-blue-600 to-cyan-600 p-2.5 rounded-xl shadow-lg transform group-hover:scale-105 transition-transform">
                <Server className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <h1 className={`text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent`}>
                DataCenter Monitor
              </h1>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Infrastructure Management System
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Terminal Navigation Button */}
            <button
              onClick={() => navigate('/terminal')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all transform hover:scale-105 ${
                theme === 'dark'
                  ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
              }`}
              title="Open Terminal"
            >
              <Terminal className="w-5 h-5" />
              <span className="font-medium">Terminal</span>
            </button>

            {/* Add Datacenter Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-5 py-2 rounded-lg transition-all shadow-lg hover:shadow-blue-500/50 transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">Add Datacenter</span>
            </button>
            
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className={`p-2.5 rounded-lg transition-all transform hover:scale-105 ${
                theme === 'dark'
                  ? 'bg-slate-700/80 hover:bg-slate-600 text-gray-300 border border-slate-600'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
              }`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg transition-all shadow-lg hover:shadow-red-500/50 transform hover:scale-105"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-semibold">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Datacenter Panels - Side by Side OR with Dashboard */}
      <div className="flex-1 px-6 py-2 overflow-hidden flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/20 border-t-blue-600 mx-auto mb-4"></div>
                <Activity className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <p className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Loading datacenters...
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Please wait while we fetch your infrastructure
              </p>
            </div>
          </div>
        ) : datacenters.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className={`max-w-2xl w-full p-12 rounded-2xl border-2 border-dashed text-center ${
              theme === 'dark' 
                ? 'bg-slate-800/50 border-blue-500/30 backdrop-blur-sm' 
                : 'bg-white/80 border-blue-300 backdrop-blur-sm'
            }`}>
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full"></div>
                <div className={`relative p-6 rounded-2xl ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-blue-50'
                }`}>
                  <Building2 className={`w-20 h-20 mx-auto ${
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                </div>
              </div>
              
              <h2 className={`text-3xl font-bold mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                No Datacenters Configured
              </h2>
              <p className={`text-lg mb-8 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Start monitoring your infrastructure by creating your first datacenter
              </p>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/50 transform hover:scale-105 font-semibold text-lg"
              >
                <Plus className="w-6 h-6" />
                <span>Create Your First Datacenter</span>
              </button>
              
              <div className={`mt-8 pt-8 border-t ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  💡 Add multiple datacenters to monitor all your locations from one dashboard
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className={`grid gap-4 flex-1 min-h-0 ${
              selectedDevice 
                ? 'grid-cols-2' 
                : datacenters.length === 1 
                ? 'grid-cols-1' 
                : 'grid-cols-2'
            }`}
            style={{ gridAutoRows: 'minmax(0, 1fr)' }}
          >
            {selectedDevice ? (
              // When device is selected, show one datacenter and dashboard
              <>
                {selectedDatacenterId === datacenters[0]?.id ? (
                  // Left datacenter clicked - show left datacenter and dashboard on right
                  <>
                    <div className="col-span-1 h-full min-h-0">
                      <DatacenterPanel
                        key={datacenters[0].id}
                        datacenter={datacenters[0]}
                        socket={socket}
                        onUpdate={loadDatacenters}
                        onDeviceClick={(device) => handleDeviceClick(device, datacenters[0].id)}
                        position="left"
                      />
                    </div>
                    <div className="col-span-1 h-full min-h-0">
                      <DeviceDashboard
                        device={selectedDevice}
                        socket={socket}
                        onClose={() => {
                          setSelectedDevice(null)
                          setSelectedDatacenterId(null)
                        }}
                      />
                    </div>
                  </>
                ) : (
                  // Right datacenter clicked - show dashboard on left and datacenter on right
                  <>
                    <div className="col-span-1 h-full min-h-0">
                      <DeviceDashboard
                        device={selectedDevice}
                        socket={socket}
                        onClose={() => {
                          setSelectedDevice(null)
                          setSelectedDatacenterId(null)
                        }}
                      />
                    </div>
                    <div className="col-span-1 h-full min-h-0">
                      <DatacenterPanel
                        key={datacenters[1]?.id || datacenters[0].id}
                        datacenter={datacenters[1] || datacenters[0]}
                        socket={socket}
                        onUpdate={loadDatacenters}
                        onDeviceClick={(device) => handleDeviceClick(device, datacenters[1]?.id || datacenters[0].id)}
                        position="right"
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              // No device selected - show datacenters
              <>
                {datacenters.slice(0, 2).map((datacenter, index) => (
                  <div key={datacenter.id} className="h-full min-h-0">
                    <DatacenterPanel
                      datacenter={datacenter}
                      socket={socket}
                      onUpdate={loadDatacenters}
                      onDeviceClick={(device) => handleDeviceClick(device, datacenter.id)}
                      position={index === 0 ? 'left' : 'right'}
                    />
                  </div>
                ))}
              </>
            )}
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
