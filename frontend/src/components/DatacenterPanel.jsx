import { useState } from 'react'
import { Building2, Plus, ChevronRight, ChevronDown } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import DeviceTree from './DeviceTree'
import TerminalTabs from './TerminalTabs'
import AddDeviceModal from './AddDeviceModal'
import { datacenterService } from '../services/datacenterService'

function DatacenterPanel({ datacenter, socket, onUpdate, onDeviceClick }) {
  const { theme } = useTheme()
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [activeTerminals, setActiveTerminals] = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [terminalHeight, setTerminalHeight] = useState(20) // Default 20%
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

    console.log('Connecting SSH to device:', device)
    console.log('SSH Config:', {
      host: device.ip_address,
      port: device.ssh_port,
      username: device.ssh_username,
      password: device.ssh_password ? '***' : 'MISSING'
    })

    // Create SSH terminal
    if (socket) {
      socket.emit('create_terminal', {
        cols: 80,
        rows: 10,
        ssh_config: {
          host: device.ip_address,
          port: device.ssh_port || 22,
          username: device.ssh_username,
          password: device.ssh_password,
        },
      })

      // Handle terminal created
      socket.once('terminal_created', (data) => {
        console.log('Terminal created:', data)
        const newTerminal = {
          id: data.terminal_id,
          title: `${device.name} (${device.ip_address})`,
          deviceId: device.id,
          device: device,
          sessionId: data.terminal_id,
        }
        setActiveTerminals((prev) => [...prev, newTerminal])
        setActiveTab(device.id)  // Set as active tab
      })

      // Handle errors
      socket.once('error', (error) => {
        console.error('SSH Connection error:', error)
        alert(`Failed to connect: ${error.message}`)
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
      <div 
        className="overflow-auto p-3"
        style={{ 
          height: activeTerminals.length > 0 
            ? `${100 - terminalHeight}%` 
            : '100%' 
        }}
      >
        <DeviceTree
          datacenter={datacenter}
          devices={datacenter.devices || []}
          onConnectSSH={handleConnectSSH}
          onEdit={handleEditDevice}
          onDelete={handleDeleteDevice}
          onDeviceClick={onDeviceClick}
        />
      </div>

      {/* Terminal Tabs - Dynamic height when active */}
      {activeTerminals.length > 0 && (
        <div 
          className={`border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`} 
          style={{ height: `${terminalHeight}%` }}
        >
          <TerminalTabs
            activeTerminals={activeTerminals}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onCloseTerminal={handleCloseTerminal}
            socket={socket}
            onHeightChange={setTerminalHeight}
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
