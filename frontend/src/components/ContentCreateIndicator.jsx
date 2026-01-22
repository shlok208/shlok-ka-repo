import React from 'react'
import { Sparkles, Image, FileText, Upload, CheckCircle } from 'lucide-react'

const ContentCreateIndicator = ({
  isOpen,
  isDarkMode,
  currentStep = 0,
  steps = [
    { label: 'Analyzing your content', icon: FileText },
    { label: 'Generating text content', icon: Sparkles },
    { label: 'Creating visuals', icon: Image },
    { label: 'Finalizing your post', icon: CheckCircle }
  ]
}) => {
  if (!isOpen) return null

  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStep) return 'completed'
    if (stepIndex === currentStep) return 'active'
    return 'pending'
  }

  const getStepIcon = (step, status) => {
    const IconComponent = step.icon
    const baseClasses = "w-5 h-5"

    if (status === 'completed') {
      return <CheckCircle className={`${baseClasses} text-green-500`} />
    } else if (status === 'active') {
      return <IconComponent className={`${baseClasses} text-blue-500 animate-pulse`} />
    } else {
      return <IconComponent className={`${baseClasses} ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl ${
        isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        {/* Content */}
        <div className="p-8 text-center">
          {/* Main Icon */}
          <div className="flex justify-center mb-6">
            <div className={`p-4 rounded-full ${
              isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'
            }`}>
              <Sparkles className={`w-8 h-8 text-blue-500 animate-spin`} />
            </div>
          </div>

          {/* Title */}
          <h2 className={`text-xl font-semibold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Creating Your Content
          </h2>

          {/* Subtitle */}
          <p className={`text-sm mb-8 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            This may take a few moments...
          </p>

          {/* Progress Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => {
              const status = getStepStatus(index)
              return (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    status === 'completed'
                      ? 'bg-green-100'
                      : status === 'active'
                        ? 'bg-blue-100'
                        : isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    {getStepIcon(step, status)}
                  </div>

                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${
                      status === 'completed'
                        ? 'text-green-600'
                        : status === 'active'
                          ? isDarkMode ? 'text-white' : 'text-gray-900'
                          : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </p>
                  </div>

                  {status === 'active' && (
                    <div className="flex-shrink-0">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Additional Info */}
          <div className={`mt-8 p-3 rounded-lg ${
            isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
          }`}>
            <p className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Please don't close this window while your content is being created.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContentCreateIndicator