import { useState } from 'react'
import { ChevronRight, ChevronDown, Monitor, Server, Network, Battery, FolderTree } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import DeviceContextMenu from './DeviceContextMenu'

const DEVICE_ICONS = {
  pc: Monitor,
  server: Server,
  switch: Network,
  ups: Battery,
}

function DeviceTree({ datacenter, devices, onConnectSSH, onEdit, onDelete }) {
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
      <div className="flex items-center space-x-2 mb-2">
        <FolderTree className="w-5 h-5 text-blue-500" />
        <span className="font-semibold">{datacenter.name}</span>
      </div>

      {/* Device Types */}
      <div className="ml-4 space-y-1">
        {Object.entries(devicesByType).map(([type, typeDevices]) => {
          const Icon = DEVICE_ICONS[type]
          const isExpanded = expandedTypes[type]

          return (
            <div key={type}>
              {/* Type Header */}
              <div
                onClick={() => toggleExpand(type)}
                className={`flex items-center space-x-2 px-2 py-1 rounded cursor-pointer ${
                  theme === 'dark'
                    ? 'hover:bg-gray-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <Icon className={`w-4 h-4 ${
                  type === 'pc' ? 'text-green-500' :
                  type === 'server' ? 'text-blue-500' :
                  type === 'switch' ? 'text-purple-500' :
                  'text-yellow-500'
                }`} />
                <span className="capitalize font-medium">
                  {type}s ({typeDevices.length})
                </span>
              </div>

              {/* Devices */}
              {isExpanded && (
                <div className="ml-6 space-y-1">
                  {typeDevices.length === 0 ? (
                    <div className={`px-2 py-1 text-sm italic ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      No {type}s added
                    </div>
                  ) : (
                    typeDevices.map((device) => (
                      <div
                        key={device.id}
                        onContextMenu={(e) => handleContextMenu(e, device)}
                        className={`flex items-center space-x-2 px-2 py-1 rounded cursor-pointer ${
                          selectedDevice?.id === device.id
                            ? theme === 'dark'
                              ? 'bg-blue-900/50'
                              : 'bg-blue-100'
                            : theme === 'dark'
                            ? 'hover:bg-gray-700'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          device.status === 'online' ? 'bg-green-500' :
                          device.status === 'error' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`} />
                        <span className="text-sm">{device.name}</span>
                        {device.ip_address && (
                          <span className={`text-xs ${
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            ({device.ip_address})
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Context Menu */}
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

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={closeContextMenu}
        />
      )}
    </div>
  )
}

export default DeviceTree
