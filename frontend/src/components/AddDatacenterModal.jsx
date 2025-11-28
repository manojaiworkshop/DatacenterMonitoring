import { useState } from 'react'
import { X, Server } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function AddDatacenterModal({ isOpen, onClose, onAdd }) {
  const { theme } = useTheme()
  const [formData, setFormData] = useState({
    name: '',
    location: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Datacenter name is required')
      return
    }

    setLoading(true)

    try {
      console.log('Modal: Submitting datacenter:', formData)
      await onAdd(formData)
      console.log('Modal: Datacenter added successfully')

      // Reset form
      setFormData({
        name: '',
        location: '',
      })

      onClose()
    } catch (err) {
      console.error('Modal: Error adding datacenter:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to add datacenter'
      console.error('Modal: Error message:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`rounded-lg shadow-xl w-full max-w-md mx-4 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-blue-500" />
            <h2
              className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              Add New Datacenter
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg ${
              theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Datacenter Name */}
          <div>
            <label
              className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Datacenter Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Primary DC, Backup DC"
              className={`w-full px-3 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              required
            />
          </div>

          {/* Location */}
          <div>
            <label
              className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., New York, London"
              className={`w-full px-3 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* Info Note */}
          <div
            className={`text-xs rounded-lg p-3 ${
              theme === 'dark'
                ? 'bg-blue-900 bg-opacity-30 text-blue-300'
                : 'bg-blue-50 text-blue-700'
            }`}
          >
            <p className="font-medium mb-1">Note:</p>
            <p>
              You can monitor up to 2 datacenters side by side. After creating a
              datacenter, you can add devices (PCs, Servers, Switches, UPS) to it.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Adding...' : 'Add Datacenter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddDatacenterModal
