import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, ChevronDown, Monitor, Server, Network, Battery, Building2, Cpu } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import DeviceContextMenu from './DeviceContextMenu'

const DEVICE_ICONS = {
  pc: Monitor,
  server: Server,
  switch: Network,
  ups: Battery,
}

const DEVICE_COLORS = {
  pc: {
    icon: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    hover: 'hover:bg-emerald-500/20'
  },
  server: {
    icon: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    hover: 'hover:bg-blue-500/20'
  },
  switch: {
    icon: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    hover: 'hover:bg-purple-500/20'
  },
  ups: {
    icon: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    hover: 'hover:bg-amber-500/20'
  }
}

function DeviceTree({ datacenter, devices, onConnectSSH, onEdit, onDelete, onDeviceClick }) {
  const { theme } = useTheme()
  const [expandedTypes, setExpandedTypes] = useState({
    pc: true,
    server: true,
    switch: true,
    ups: true,
  })
  const [contextMenu, setContextMenu] = useState(null)
  const [selectedDevice, setSelectedDevice] = useState(null)

  // Group devices by type
  const devicesByType = {
    pc: devices.filter((d) => d.device_type === 'pc'),
    server: devices.filter((d) => d.device_type === 'server'),
    switch: devices.filter((d) => d.device_type === 'switch'),
    ups: devices.filter((d) => d.device_type === 'ups'),
  }

  const toggleExpand = (type) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  const handleDeviceClick = (device) => {
    // Only show dashboard for PC and server types
    if ((device.device_type === 'pc' || device.device_type === 'server') && onDeviceClick) {
      onDeviceClick(device)
    }
  }

  const handleContextMenu = (e, device) => {
    e.preventDefault()
    setSelectedDevice(device)
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      device,
    })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
    setSelectedDevice(null)
  }

  const handleSSH = (device) => {
    onConnectSSH(device)
    closeContextMenu()
  }

  const handleEdit = () => {
    // TODO: Open edit modal
    closeContextMenu()
  }

  const handleRemove = () => {
    onDelete(selectedDevice)
    closeContextMenu()
  }

  const canSSH = (deviceType) => {
    return deviceType === 'pc' || deviceType === 'server'
  }

  return (
    <div className={`select-none ${
      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
    }`}>
      {/* Root - Datacenter */}
      <div className={`flex items-center space-x-3 mb-4 p-3 rounded-lg border ${
        theme === 'dark' 
          ? 'bg-slate-700/50 border-blue-500/20' 
          : 'bg-blue-50/50 border-blue-200'
      }`}>
        <div className="relative">
          <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-500/10'} blur-md rounded-lg`}></div>
          <div className="relative bg-gradient-to-br from-blue-600 to-cyan-600 p-1.5 rounded-lg">
            <Building2 className="w-4 h-4 text-white" />
          </div>
        </div>
        <div>
          <span className={`font-bold text-sm ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            {datacenter.name}
          </span>
          <div className={`text-xs ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {devices.length} device{devices.length !== 1 ? 's' : ''} total
          </div>
        </div>
      </div>

      {/* Device Types */}
      <div className="space-y-3">
        {Object.entries(devicesByType).map(([type, typeDevices]) => {
          const Icon = DEVICE_ICONS[type]
          const colors = DEVICE_COLORS[type]
          const isExpanded = expandedTypes[type]

          return (
            <div key={type} className={`rounded-lg border ${
              theme === 'dark' 
                ? `${colors.bg} ${colors.border}` 
                : `${colors.bg} ${colors.border}`
            }`}>
              {/* Type Header */}
              <div
                onClick={() => toggleExpand(type)}
                className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-all ${
                  theme === 'dark'
                    ? colors.hover
                    : colors.hover
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    {isExpanded ? (
                      <ChevronDown className={`w-4 h-4 ${colors.icon}`} />
                    ) : (
                      <ChevronRight className={`w-4 h-4 ${colors.icon}`} />
                    )}
                    <Icon className={`w-5 h-5 ${colors.icon}`} />
                  </div>
                  <div>
                    <span className={`capitalize font-semibold text-sm ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      {type}s
                    </span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      theme === 'dark' 
                        ? 'bg-slate-700 text-gray-300' 
                        : 'bg-white text-gray-600'
                    }`}>
                      {typeDevices.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Devices */}
              {isExpanded && (
                <div className={`px-2 pb-2 space-y-1 ${
                  typeDevices.length > 0 ? 'pt-1' : ''
                }`}>
                  {typeDevices.length === 0 ? (
                    <div className={`px-3 py-2 text-xs text-center rounded ${
                      theme === 'dark' ? 'text-gray-500 bg-slate-800/30' : 'text-gray-500 bg-white/50'
                    }`}>
                      No {type}s added yet
                    </div>
                  ) : (
                    typeDevices.map((device) => (
                      <div
                        key={device.id}
                        onClick={() => handleDeviceClick(device)}
                        onContextMenu={(e) => handleContextMenu(e, device)}
                        className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all border ${
                          selectedDevice?.id === device.id
                            ? theme === 'dark'
                              ? 'bg-blue-600/30 border-blue-500/50 shadow-md'
                              : 'bg-blue-100 border-blue-300 shadow-md'
                            : theme === 'dark'
                            ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/70 hover:border-slate-600'
                            : 'bg-white/70 border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                        title={
                          device.device_type === 'pc' || device.device_type === 'server'
                            ? 'Click to view dashboard • Right-click for options'
                            : 'Right-click for options'
                        }
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {/* Status Indicator */}
                          <div className="relative flex-shrink-0">
                            <div className={`w-2 h-2 rounded-full ${
                              device.status === 'online' 
                                ? 'bg-green-500 animate-pulse' 
                                : device.status === 'error' 
                                ? 'bg-red-500' 
                                : 'bg-gray-500'
                            }`} />
                            {device.status === 'online' && (
                              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75"></div>
                            )}
                          </div>
                          
                          {/* Device Info */}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${
                              theme === 'dark' ? 'text-white' : 'text-gray-800'
                            }`}>
                              {device.name}
                            </div>
                            {device.ip_address && (
                              <div className={`text-xs flex items-center space-x-1 ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                <Cpu className="w-3 h-3" />
                                <span className="truncate">{device.ip_address}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                          device.status === 'online'
                            ? theme === 'dark'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-green-100 text-green-700'
                            : device.status === 'error'
                            ? theme === 'dark'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-red-100 text-red-700'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-gray-400'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {device.status || 'offline'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Click outside to close context menu - Portal to escape overflow containers */}
      {contextMenu && createPortal(
        <div
          className="fixed inset-0 z-[9998]"
          onClick={closeContextMenu}
        />,
        document.body
      )}

      {/* Context Menu - Rendered via portal in DeviceContextMenu component */}
      {contextMenu && (
        <DeviceContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          device={contextMenu.device}
          canSSH={canSSH(contextMenu.device.device_type)}
          onSSH={() => handleSSH(contextMenu.device)}
          onEdit={handleEdit}
          onRemove={handleRemove}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}

export default DeviceTree
