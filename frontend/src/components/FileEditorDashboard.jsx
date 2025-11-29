import { useState, useEffect } from 'react'
import { 
  X, 
  Folder, 
  File, 
  ChevronRight, 
  Search,
  Save,
  FileText,
  RefreshCw,
  AlertCircle,
  FolderOpen
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function FileEditorDashboard({ device, socket, onClose }) {
  const { theme } = useTheme()
  const [currentPath, setCurrentPath] = useState('/')
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    if (!socket || !device) return

    // Load root directory on mount
    loadDirectory('/')

    // Listen for socket events
    socket.on('directory_listed', handleDirectoryListed)
    socket.on('file_read', handleFileRead)
    socket.on('file_written', handleFileWritten)
    socket.on('files_searched', handleFilesSearched)
    socket.on('file_error', handleFileError)

    return () => {
      socket.off('directory_listed', handleDirectoryListed)
      socket.off('file_read', handleFileRead)
      socket.off('file_written', handleFileWritten)
      socket.off('files_searched', handleFilesSearched)
      socket.off('file_error', handleFileError)
      
      // Close file manager connection
      socket.emit('close_file_manager', {
        device_id: device.id
      })
    }
  }, [socket, device])

  const loadDirectory = (path) => {
    if (!socket) return
    
    setLoading(true)
    setError(null)
    
    socket.emit('list_directory', {
      device_id: device.id,
      host: device.ip_address,
      port: device.ssh_port || 22,
      username: device.ssh_username,
      password: device.ssh_password,
      path: path
    })
  }

  const handleDirectoryListed = (data) => {
    if (data.device_id !== device.id) return
    
    setLoading(false)
    
    if (data.data.error) {
      setError(data.data.error)
    } else {
      setCurrentPath(data.path)
      setFiles(data.data.items || [])
    }
  }

  const handleFileClick = (file) => {
    if (file.is_directory) {
      loadDirectory(file.path)
    } else {
      // Check for unsaved changes
      if (hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Do you want to discard them?')) {
          return
        }
      }
      
      loadFile(file)
    }
  }

  const loadFile = (file) => {
    if (!socket) return
    
    setLoading(true)
    setError(null)
    
    socket.emit('read_file', {
      device_id: device.id,
      host: device.ip_address,
      port: device.ssh_port || 22,
      username: device.ssh_username,
      password: device.ssh_password,
      file_path: file.path
    })
  }

  const handleFileRead = (data) => {
    if (data.device_id !== device.id) return
    
    setLoading(false)
    
    if (data.data.error) {
      setError(data.data.error)
    } else if (data.data.binary) {
      setError('Cannot edit binary files')
      setSelectedFile(null)
    } else {
      setSelectedFile({ path: data.data.path })
      setFileContent(data.data.content || '')
      setOriginalContent(data.data.content || '')
      setHasUnsavedChanges(false)
    }
  }

  const handleContentChange = (newContent) => {
    setFileContent(newContent)
    setHasUnsavedChanges(newContent !== originalContent)
  }

  const saveFile = () => {
    if (!socket || !selectedFile) return
    
    setSaving(true)
    setError(null)
    
    socket.emit('write_file', {
      device_id: device.id,
      host: device.ip_address,
      port: device.ssh_port || 22,
      username: device.ssh_username,
      password: device.ssh_password,
      file_path: selectedFile.path,
      content: fileContent
    })
  }

  const handleFileWritten = (data) => {
    if (data.device_id !== device.id) return
    
    setSaving(false)
    
    if (data.data.error) {
      setError(data.data.error)
    } else {
      setOriginalContent(fileContent)
      setHasUnsavedChanges(false)
      // Show success message briefly
      const successMsg = error
      setError('✓ File saved successfully!')
      setTimeout(() => setError(successMsg), 2000)
    }
  }

  const handleSearch = () => {
    if (!socket || !searchQuery.trim()) return
    
    setSearching(true)
    setError(null)
    
    socket.emit('search_files', {
      device_id: device.id,
      host: device.ip_address,
      port: device.ssh_port || 22,
      username: device.ssh_username,
      password: device.ssh_password,
      search_path: currentPath,
      query: searchQuery
    })
  }

  const handleFilesSearched = (data) => {
    if (data.device_id !== device.id) return
    
    setSearching(false)
    
    if (data.data.error) {
      setError(data.data.error)
    } else {
      setSearchResults(data.data.results || [])
    }
  }

  const handleFileError = (data) => {
    setLoading(false)
    setSaving(false)
    setSearching(false)
    setError(data.error)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (file) => {
    if (file.is_directory) return FolderOpen
    return FileText
  }

  const navigateUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
    loadDirectory(parentPath)
  }

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Do you want to discard them?')) {
        return
      }
    }
    onClose()
  }

  return (
    <div className={`flex flex-col h-full ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
    } rounded-lg border ${
      theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        theme === 'dark'
          ? 'bg-gray-900 border-gray-700'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          <FolderOpen className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              File Editor - {device.name}
            </h2>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {device.ip_address}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleClose}
          className={`p-2 rounded-lg transition-colors ${
            theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-400'
              : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel - File Tree (20%) */}
        <div className={`w-1/5 border-r flex flex-col ${
          theme === 'dark' ? 'border-gray-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
        }`}>
          {/* Search Bar */}
          <div className={`p-3 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className={`absolute left-2 top-2 w-4 h-4 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search files..."
                  className={`w-full pl-8 pr-3 py-2 text-sm rounded border ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-700 disabled:text-gray-500'
                    : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:text-gray-500'
                }`}
              >
                {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Go'}
              </button>
            </div>
            
            {/* Current Path */}
            <div className={`mt-2 text-xs truncate ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <span className="font-mono">{currentPath}</span>
            </div>
          </div>

          {/* File Tree */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading && files.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className={`w-6 h-6 animate-spin ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
            ) : (
              <>
                {/* Parent Directory Button */}
                {currentPath !== '/' && (
                  <button
                    onClick={navigateUp}
                    className={`w-full text-left px-2 py-1 rounded text-sm flex items-center space-x-2 mb-1 ${
                      theme === 'dark'
                        ? 'hover:bg-slate-700 text-gray-300'
                        : 'hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4 transform rotate-180" />
                    <span>..</span>
                  </button>
                )}
                
                {/* File List */}
                {files.map((file, index) => {
                  const Icon = getFileIcon(file)
                  return (
                    <button
                      key={index}
                      onClick={() => handleFileClick(file)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center space-x-2 mb-0.5 ${
                        selectedFile?.path === file.path
                          ? theme === 'dark'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-800'
                          : theme === 'dark'
                          ? 'hover:bg-slate-700 text-gray-300'
                          : 'hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${
                        file.is_directory 
                          ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                          : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <span className="truncate flex-1">{file.name}</span>
                      {!file.is_directory && (
                        <span className={`text-xs ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {formatFileSize(file.size)}
                        </span>
                      )}
                    </button>
                  )
                })}
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className={`mt-4 pt-4 border-t ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <div className={`text-xs font-semibold mb-2 px-2 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Search Results ({searchResults.length})
                    </div>
                    {searchResults.map((filePath, index) => (
                      <button
                        key={index}
                        onClick={() => handleFileClick({ path: filePath, is_directory: false, name: filePath.split('/').pop() })}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center space-x-2 mb-0.5 ${
                          theme === 'dark'
                            ? 'hover:bg-slate-700 text-gray-400'
                            : 'hover:bg-gray-200 text-gray-600'
                        }`}
                      >
                        <FileText className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate font-mono">{filePath}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Editor (80%) */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedFile ? (
            <>
              {/* Editor Header */}
              <div className={`px-4 py-2 border-b flex items-center justify-between ${
                theme === 'dark'
                  ? 'bg-slate-800 border-gray-700'
                  : 'bg-gray-100 border-gray-200'
              }`}>
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <FileText className={`w-4 h-4 flex-shrink-0 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                  <span className={`text-sm font-mono truncate ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {selectedFile.path}
                  </span>
                  {hasUnsavedChanges && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      theme === 'dark' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      Modified
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={saveFile}
                    disabled={saving || !hasUnsavedChanges}
                    className={`flex items-center space-x-2 px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                      hasUnsavedChanges
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : theme === 'dark'
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (hasUnsavedChanges && !confirm('Discard unsaved changes?')) return
                      setSelectedFile(null)
                      setFileContent('')
                      setHasUnsavedChanges(false)
                    }}
                    className={`p-1.5 rounded transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-slate-700 text-gray-400'
                        : 'hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 overflow-hidden">
                <textarea
                  value={fileContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className={`w-full h-full p-4 font-mono text-sm resize-none focus:outline-none ${
                    theme === 'dark'
                      ? 'bg-slate-900 text-gray-300'
                      : 'bg-white text-gray-800'
                  }`}
                  spellCheck={false}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <FolderOpen className={`w-16 h-16 mx-auto mb-4 ${
                  theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                }`} />
                <h3 className={`text-lg font-semibold mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  No File Selected
                </h3>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  Browse the file tree on the left and select a file to edit
                </p>
              </div>
            </div>
          )}

          {/* Error Toast */}
          {error && (
            <div className={`absolute bottom-4 right-4 max-w-md rounded-lg shadow-lg p-4 ${
              error.includes('success') || error.includes('✓')
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}>
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="flex-shrink-0 hover:bg-white/20 rounded p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FileEditorDashboard
