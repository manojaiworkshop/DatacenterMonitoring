import { useState, useEffect } from 'react'
import { Building2, Plus, Terminal as TerminalIcon, Maximize2, Minimize2, GripHorizontal, ChevronDown } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import DeviceTree from './DeviceTree'
import TerminalTabs from './TerminalTabs'
import AddDeviceModal from './AddDeviceModal'
import { datacenterService } from '../services/datacenterService'

function DatacenterPanel({ datacenter, socket, onUpdate, onDeviceClick, position = 'left' }) {
  const { theme } = useTheme()
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [activeTerminals, setActiveTerminals] = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [terminalHeight, setTerminalHeight] = useState(40) // Default 40%
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [showTerminals, setShowTerminals] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

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
        setActiveTab(data.terminal_id)  // Set active tab to terminal ID
        setShowTerminals(true)  // Auto-open terminal panel
      })

      // Handle errors
      socket.once('error', (error) => {
        console.error('SSH Connection error:', error)
        alert(`Failed to connect: ${error.message}`)
      })
    }
  }

  const toggleTerminals = () => {
    setShowTerminals(!showTerminals)
  }

  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  // Handle resize drag
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      const panel = document.querySelector(`[data-datacenter-id="${datacenter.id}"]`)
      if (!panel) return

      const rect = panel.getBoundingClientRect()
      const mouseY = e.clientY
      const panelTop = rect.top
      const panelHeight = rect.height
      
      // Calculate distance from top to mouse
      const distanceFromTop = mouseY - panelTop
      
      // Calculate new terminal height as percentage (from bottom)
      const newHeight = ((panelHeight - distanceFromTop) / panelHeight) * 100
      
      // Constrain between 20% and 80%
      const constrainedHeight = Math.min(Math.max(newHeight, 20), 80)
      setTerminalHeight(constrainedHeight)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, datacenter.id])

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
    <div 
      data-datacenter-id={datacenter.id}
      className={`relative flex flex-col h-full rounded-2xl overflow-hidden border shadow-xl ${
        theme === 'dark' 
          ? 'bg-slate-800/80 border-blue-500/20 backdrop-blur-sm' 
          : 'bg-white/90 border-blue-200 backdrop-blur-sm'
      }`}
    >
      {/* Datacenter Header with Gradient */}
      <div className={`flex-shrink-0 px-5 py-4 border-b ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-slate-900/90 to-slate-800/90 border-blue-500/20'
          : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h2 className={`text-lg font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                {datacenter.name}
              </h2>
              {datacenter.location && (
                <div className="flex items-center space-x-1 mt-0.5">
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className={`text-xs font-medium ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {datacenter.location}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={() => setShowAddDevice(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-blue-500/50 transform hover:scale-105 text-sm font-semibold"
            title="Add Device"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      {/* Content Area - Device Tree with Scroll - Flex-1 to take remaining space */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <DeviceTree
          datacenter={datacenter}
          devices={datacenter.devices || []}
          onConnectSSH={handleConnectSSH}
          onEdit={handleEditDevice}
          onDelete={handleDeleteDevice}
          onDeviceClick={onDeviceClick}
        />
      </div>

      {/* Terminal Panel - Floating Overlay with High Z-Index */}
      {activeTerminals.length > 0 && showTerminals && (
        <div 
          className={`absolute bottom-0 left-0 right-0 border-t shadow-2xl z-50 ${
            theme === 'dark' 
              ? 'border-blue-500/30 bg-slate-900/98 backdrop-blur-xl' 
              : 'border-blue-200 bg-white/98 backdrop-blur-xl'
          }`}
          style={{
            height: `${terminalHeight}%`
          }}
        >
          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`flex items-center justify-center cursor-ns-resize border-b select-none ${
              isDragging 
                ? 'bg-blue-500 h-1.5' 
                : theme === 'dark' 
                ? 'bg-gray-700 hover:bg-blue-600 border-gray-600 h-1 hover:h-1.5' 
                : 'bg-gray-300 hover:bg-blue-400 border-gray-400 h-1 hover:h-1.5'
            } transition-all`}
            title="Drag to resize terminal"
          >
            <GripHorizontal className={`w-8 h-4 ${
              isDragging 
                ? 'text-white' 
                : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`} />
          </div>

          {/* Terminal Header with Controls */}
          <div 
            className={`flex items-center justify-between px-4 py-2 ${
              theme === 'dark'
                ? 'bg-slate-900/90'
                : 'bg-blue-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <TerminalIcon className="w-4 h-4 text-blue-500" />
              <span className={`text-sm font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                SSH Terminals ({activeTerminals.length})
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              {/* Minimize Button */}
              <button 
                onClick={() => setShowTerminals(false)}
                className={`p-1.5 rounded transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-blue-200'
                }`}
                title="Minimize"
              >
                <Minimize2 className="w-4 h-4 text-gray-500" />
              </button>
              
              {/* Maximize/Restore Button */}
              <button 
                onClick={() => setTerminalHeight(terminalHeight === 80 ? 40 : 80)}
                className={`p-1.5 rounded transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-blue-200'
                }`}
                title={terminalHeight === 80 ? "Restore" : "Maximize"}
              >
                <Maximize2 className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Terminal Content */}
          <div className="h-[calc(100%-50px)]">
            <TerminalTabs
              activeTerminals={activeTerminals}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onCloseTerminal={handleCloseTerminal}
              socket={socket}
              terminalHeight={terminalHeight}
            />
          </div>
        </div>
      )}

      {/* Terminal Icon Button - Always Visible at Corner */}
      {activeTerminals.length > 0 && (
        <button
          onClick={() => setShowTerminals(!showTerminals)}
          className={`absolute ${position === 'left' ? 'left-4' : 'right-4'} bottom-4 z-[60] flex items-center space-x-2 px-4 py-2.5 rounded-lg shadow-xl transition-all transform hover:scale-110 ${
            showTerminals
              ? theme === 'dark'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
              : theme === 'dark'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
              : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
          }`}
          title={showTerminals ? "Hide SSH Terminals" : "Show SSH Terminals"}
        >
          <TerminalIcon className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-sm">{activeTerminals.length}</span>
          {showTerminals && (
            <ChevronDown className="w-4 h-4 text-white ml-1" />
          )}
        </button>
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
