import { Cpu, HardDrive, Activity } from 'lucide-react'

function SystemMetrics({ stats, theme }) {
  if (!stats) return null

  const getColorByPercentage = (percent) => {
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-4">
        {/* CPU Usage */}
        <div className={`p-4 rounded-lg border ${
          theme === 'dark'
            ? 'bg-gray-900 border-gray-700'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-blue-500" />
              <span className={`font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                CPU
              </span>
            </div>
            <span className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              {stats.cpu?.percent || 0}%
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className={`w-full h-2 rounded-full overflow-hidden ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <div
              className={`h-full ${getColorByPercentage(stats.cpu?.percent || 0)} transition-all duration-500`}
              style={{ width: `${stats.cpu?.percent || 0}%` }}
            />
          </div>
          
          <p className={`text-xs mt-2 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            CPU Usage
          </p>
        </div>

        {/* Memory Usage */}
        <div className={`p-4 rounded-lg border ${
          theme === 'dark'
            ? 'bg-gray-900 border-gray-700'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-purple-500" />
              <span className={`font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                RAM
              </span>
            </div>
            <span className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              {stats.memory?.percent?.toFixed(1) || 0}%
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className={`w-full h-2 rounded-full overflow-hidden ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <div
              className={`h-full ${getColorByPercentage(stats.memory?.percent || 0)} transition-all duration-500`}
              style={{ width: `${stats.memory?.percent || 0}%` }}
            />
          </div>
          
          <p className={`text-xs mt-2 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {stats.memory?.used || 0}MB / {stats.memory?.total || 0}MB
          </p>
        </div>

        {/* Disk Usage */}
        <div className={`p-4 rounded-lg border ${
          theme === 'dark'
            ? 'bg-gray-900 border-gray-700'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-5 h-5 text-orange-500" />
              <span className={`font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                Disk
              </span>
            </div>
            <span className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              {stats.disk?.percent || '0%'}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className={`w-full h-2 rounded-full overflow-hidden ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <div
              className={`h-full ${getColorByPercentage(
                parseInt(stats.disk?.percent) || 0
              )} transition-all duration-500`}
              style={{ width: stats.disk?.percent || '0%' }}
            />
          </div>
          
          <p className={`text-xs mt-2 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {stats.disk?.used || '0G'} / {stats.disk?.total || '0G'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default SystemMetrics
