import { Terminal, Edit, Trash2, FolderOpen } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

function DeviceContextMenu({ x, y, device, canSSH, onSSH, onEdit, onRemove, onFileEditor, onClose }) {
  const { theme } = useTheme()
  const [position, setPosition] = useState({ top: y, left: x })

  useEffect(() => {
    // Adjust position if menu would go off screen
    const menuWidth = 200
    const menuHeight = canSSH ? 160 : 120 // Increased height for new option
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    let adjustedX = x
    let adjustedY = y

    // Check if menu goes off right edge
    if (x + menuWidth > windowWidth) {
      adjustedX = x - menuWidth
    }

    // Check if menu goes off bottom edge
    if (y + menuHeight > windowHeight) {
      adjustedY = y - menuHeight
    }

    setPosition({ top: adjustedY, left: adjustedX })
  }, [x, y, canSSH])

  const menuContent = (
    <div
      className={`fixed z-[9999] min-w-[180px] rounded-lg shadow-2xl border ${
        theme === 'dark'
          ? 'bg-slate-800/95 border-blue-500/30 backdrop-blur-sm'
          : 'bg-white/95 border-blue-200 backdrop-blur-sm'
      }`}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      {canSSH && (
        <>
          <button
            onClick={onSSH}
            className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-t-lg transition-all ${
              theme === 'dark'
                ? 'hover:bg-slate-700 text-white'
                : 'hover:bg-blue-50 text-gray-800'
            }`}
          >
            <Terminal className="w-4 h-4 text-green-500" />
            <span>Connect SSH</span>
          </button>
          <button
            onClick={onFileEditor}
            className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all ${
              theme === 'dark'
                ? 'hover:bg-slate-700 text-white'
                : 'hover:bg-blue-50 text-gray-800'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-purple-500" />
            <span>File Editor</span>
          </button>
        </>
      )}
      <button
        onClick={onEdit}
        className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all ${
          theme === 'dark'
            ? 'hover:bg-slate-700 text-white'
            : 'hover:bg-blue-50 text-gray-800'
        } ${!canSSH && 'rounded-t-lg'}`}
      >
        <Edit className="w-4 h-4 text-blue-500" />
        <span>Edit Device</span>
      </button>
      <button
        onClick={onRemove}
        className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-b-lg transition-all ${
          theme === 'dark'
            ? 'hover:bg-red-900/30 text-red-400'
            : 'hover:bg-red-50 text-red-600'
        }`}
      >
        <Trash2 className="w-4 h-4" />
        <span>Remove Device</span>
      </button>
    </div>
  )

  // Render into document body using portal to escape overflow-hidden containers
  return createPortal(menuContent, document.body)
}

export default DeviceContextMenu
