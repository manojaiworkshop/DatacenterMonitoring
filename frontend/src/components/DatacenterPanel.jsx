import { useState } from 'react'
import { Building2, Plus, ChevronRight, ChevronDown } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import DeviceTree from './DeviceTree'
import TerminalTabs from './TerminalTabs'
import AddDeviceModal from './AddDeviceModal'
import { datacenterService } from '../services/datacenterService'

function DatacenterPanel({ datacenter, socket, onUpdate }) {
  const { theme } = useTheme()
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [activeTerminals, setActiveTerminals] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)

  const handleAddDevice = async (deviceData) => {
    await datacenterService.addDevice(datacenter.id, {
      ...deviceData,
      datacenter_id: datacenter.id
    })
    await onUpdate()
  }

  const handleConnectSSH = (device) => {
    if (activeTerminals.length >= 3) {
      alert('Maximum 3 terminals allowed per datacenter')
      return
    }

    // Create SSH terminal
    if (socket) {
      socket.emit('create_terminal', {
        cols: 80,
        rows: 10,
        ssh_config: {
          host: device.ip_address,
          port: device.ssh_port,
          username: device.ssh_username,
          password: device.ssh_password,
        },
      })

      socket.once('terminal_created', (data) => {
        setActiveTerminals((prev) => [
          ...prev,
          {
            id: data.terminal_id,
            title: `${device.name} (${device.ip_address})`,
            deviceId: device.id,
          },
        ])
      })
    }
  }

  const handleCloseTerminal = (terminalId) => {
    if (socket) {
      socket.emit('close_terminal', { terminal_id: terminalId })
    }
    setActiveTerminals((prev) => prev.filter((t) => t.id !== terminalId))
  }

  const handleEditDevice = async (device, updatedData) => {
    try {
      await datacenterService.updateDevice(datacenter.id, device.id, updatedData)
      await onUpdate()
    } catch (error) {
      console.error('Failed to update device:', error)
      alert('Failed to update device')
    }
  }

  const handleDeleteDevice = async (device) => {
    if (!confirm(`Are you sure you want to delete ${device.name}?`)) {
      return
    }

    try {
      await datacenterService.deleteDevice(datacenter.id, device.id)
      await onUpdate()
    } catch (error) {
      console.error('Failed to delete device:', error)
      alert('Failed to delete device')
    }
  }

  return (
    <div className={`flex flex-col h-full rounded-lg overflow-hidden border ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-300'
    }`}>
      {/* Datacenter Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        theme === 'dark'
          ? 'bg-gray-900 border-gray-700'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          <Building2 className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              {datacenter.name}
            </h2>
            {datacenter.location && (
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {datacenter.location}
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setShowAddDevice(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
          title="Add Device"
        >
          <Plus className="w-4 h-4" />
          <span>Add Device</span>
        </button>
      </div>

      {/* Content Area - Device Tree */}
      <div className={`flex-1 overflow-auto p-3 ${
        activeTerminals.length > 0 ? 'h-[80%]' : ''
      }`}>
        <DeviceTree
          datacenter={datacenter}
          devices={datacenter.devices || []}
          onConnectSSH={handleConnectSSH}
          onEdit={handleEditDevice}
          onDelete={handleDeleteDevice}
        />
      </div>

      {/* Terminal Tabs - 20% height when active */}
      {activeTerminals.length > 0 && (
        <div className={`border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`} style={{ height: '20%' }}>
          <TerminalTabs
            terminals={activeTerminals}
            socket={socket}
            onClose={handleCloseTerminal}
          />
        </div>
      )}

      {/* Add Device Modal */}
      <AddDeviceModal
        isOpen={showAddDevice}
        onClose={() => setShowAddDevice(false)}
        onAdd={handleAddDevice}
        datacenterId={datacenter.id}
      />
    </div>
  )
}

export default DatacenterPanel
