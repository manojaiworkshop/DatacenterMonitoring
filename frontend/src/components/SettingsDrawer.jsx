import React, { useState } from 'react';
import { X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const SettingsDrawer = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('theme');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'theme'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Theme
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'terminal'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Terminal
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'theme' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                  Appearance
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Choose your preferred theme for the application and terminals
                </p>
              </div>

              {/* Theme Options */}
              <div className="space-y-3">
                {/* Light Theme */}
                <div
                  onClick={() => setTheme('light')}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    theme === 'light'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                    theme === 'light' ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Sun className={`w-6 h-6 ${
                      theme === 'light' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="font-medium text-gray-800 dark:text-white">
                      Light Theme
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Bright and clean interface
                    </div>
                  </div>
                  {theme === 'light' && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Dark Theme */}
                <div
                  onClick={() => setTheme('dark')}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                    theme === 'dark' ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Moon className={`w-6 h-6 ${
                      theme === 'dark' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="font-medium text-gray-800 dark:text-white">
                      Dark Theme
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Easy on the eyes
                    </div>
                  </div>
                  {theme === 'dark' && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Preview
                </h4>
                <div className={`p-4 rounded-lg border ${
                  theme === 'light'
                    ? 'bg-white border-gray-200'
                    : 'bg-gray-900 border-gray-700'
                }`}>
                  <div className={`text-sm font-mono ${
                    theme === 'light' ? 'text-gray-800' : 'text-green-400'
                  }`}>
                    user@host:~$ ls -la
                  </div>
                  <div className={`text-sm font-mono mt-1 ${
                    theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    total 48
                  </div>
                  <div className={`text-sm font-mono ${
                    theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    drwxr-xr-x 2 user user 4096
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                  Terminal Settings
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Configure terminal appearance and behavior
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Font Size
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white">
                    <option>12px</option>
                    <option>14px</option>
                    <option selected>16px</option>
                    <option>18px</option>
                    <option>20px</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cursor Style
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white">
                    <option>Block</option>
                    <option>Underline</option>
                    <option selected>Bar</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cursor Blink
                  </label>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                    <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Scrollback Lines
                  </label>
                  <input 
                    type="number" 
                    defaultValue="1000"
                    className="w-24 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </>
  );
};

export default SettingsDrawer;
