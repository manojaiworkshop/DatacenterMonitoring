import { Terminal, Edit, Trash2 } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function DeviceContextMenu({ x, y, device, canSSH, onSSH, onEdit, onRemove, onClose }) {
  const { theme } = useTheme()

  return (
    <div
      className={`fixed z-20 min-w-[150px] rounded-lg shadow-lg border ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}
      style={{ top: y, left: x }}
    >
      {canSSH && (
        <button
          onClick={onSSH}
          className={`w-full flex items-center space-x-2 px-4 py-2 text-sm rounded-t-lg ${
            theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-200'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          <Terminal className="w-4 h-4 text-green-500" />
          <span>Connect SSH</span>
        </button>
      )}
      <button
        onClick={onEdit}
        className={`w-full flex items-center space-x-2 px-4 py-2 text-sm ${
          theme === 'dark'
            ? 'hover:bg-gray-700 text-gray-200'
            : 'hover:bg-gray-100 text-gray-700'
        } ${!canSSH && 'rounded-t-lg'}`}
      >
        <Edit className="w-4 h-4 text-blue-500" />
        <span>Edit Device</span>
      </button>
      <button
        onClick={onRemove}
        className={`w-full flex items-center space-x-2 px-4 py-2 text-sm rounded-b-lg ${
          theme === 'dark'
            ? 'hover:bg-gray-700 text-red-400'
            : 'hover:bg-gray-100 text-red-600'
        }`}
      >
        <Trash2 className="w-4 h-4" />
        <span>Remove Device</span>
      </button>
    </div>
  )
}

export default DeviceContextMenu
