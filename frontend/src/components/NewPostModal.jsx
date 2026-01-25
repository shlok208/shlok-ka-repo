import React, { useState, useEffect } from 'react'
import { X, Upload, File, Video, Image as ImageIcon, Trash2 } from 'lucide-react'

const NewPostModal = ({ isOpen, onClose, onSubmit, isDarkMode }) => {

  const [formData, setFormData] = useState({
    channel: '',
    platform: '',
    content_type: '',
    media: '',
    content_idea: '',
    Post_type: '',
    Image_type: ''
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState({})

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        channel: '',
        platform: '',
        content_type: '',
        media: '',
        content_idea: '',
        Post_type: '',
        Image_type: ''
      })
      setErrors({})
      setUploadedFiles([])
      setUploadProgress({})
    }
  }, [isOpen])

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }

      // Reset dependent fields when parent field changes
      if (field === 'channel') {
        newData.platform = ''
        newData.content_type = ''
        newData.media = ''
      } else if (field === 'platform') {
        newData.content_type = ''
        // If switching to Instagram and current media is "Text Only", reset it
        if (value === 'Instagram' && prev.media === 'Without media') {
          newData.media = ''
        } else {
          newData.media = ''
        }
      } else if (field === 'content_type') {
        // Reset media when content type changes, especially if switching to/from video types
        const isVideoType = value === 'short_video or reel' || value === 'long_video'
        const wasVideoType = prev.content_type === 'short_video or reel' || prev.content_type === 'long_video'
        
        // If switching to/from video type, or if current media is "Generate" and switching to video, reset media
        if (isVideoType !== wasVideoType || (isVideoType && prev.media === 'Generate')) {
          newData.media = ''
          newData.Image_type = ''
          setUploadedFiles([])
          setUploadProgress({})
        } else if (prev.media === 'Generate') {
          // Keep media selection if it's still valid
          newData.Image_type = ''
        }
      } else if (field === 'media') {
        newData.Image_type = ''
        // Clear uploaded files when changing media option
        if (value !== 'Upload') {
          setUploadedFiles([])
          setUploadProgress({})
        }
      }

      return newData
    })

    // Clear error when field is filled
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }))
    }
  }

  const uploadFileImmediately = async (fileObj) => {
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', fileObj.file)

      const token = localStorage.getItem('authToken')
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/upload-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload failed response:', response.status, errorText)
        throw new Error(`Upload failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      // Update file with uploaded URL
      setUploadedFiles(prev => prev.map(f =>
        f.id === fileObj.id ? { ...f, url: result.url, uploading: false } : f
      ))

      return result.url
    } catch (error) {
      console.error(`Failed to upload ${fileObj.name}:`, error)
      setUploadedFiles(prev => prev.map(f =>
        f.id === fileObj.id ? { ...f, uploading: false, error: true } : f
      ))
      throw error
    }
  }

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files)

    // Validate files
    const maxSize = 300 * 1024 * 1024 // 300MB in bytes
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'
    ]

    const validFiles = []
    const errors = []

    files.forEach((file, index) => {
      if (file.size > maxSize) {
        errors.push(`${file.name}: File size must be less than 300MB`)
        return
      }

      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Only images and videos are allowed`)
        return
      }

      validFiles.push({
        file,
        id: Date.now() + index,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file), // For preview
        uploading: true,
        error: false
      })
    })

    if (errors.length > 0) {
      setErrors(prev => ({ ...prev, files: errors }))
      return
    }

    // Add valid files to state first
    setUploadedFiles(prev => [...prev, ...validFiles])
    setErrors(prev => ({ ...prev, files: null }))

    // Upload files immediately
    for (const fileObj of validFiles) {
      try {
        await uploadFileImmediately(fileObj)
      } catch (error) {
        // Error already handled in uploadFileImmediately
      }
    }

    // Clear the input
    event.target.value = ''
  }

  const removeFile = (fileId) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(file => file.id !== fileId)
      // Clean up object URL to prevent memory leaks
      const removedFile = prev.find(file => file.id === fileId)
      if (removedFile) {
        URL.revokeObjectURL(removedFile.url)
      }
      return updated
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-blue-500" />
    } else if (fileType.startsWith('video/')) {
      return <Video className="w-8 h-8 text-red-500" />
    }
    return <File className="w-8 h-8 text-gray-500" />
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.channel) newErrors.channel = 'Please select a channel'
    if (!formData.platform) newErrors.platform = 'Please select a platform'
    if (!formData.content_type) newErrors.content_type = 'Please select content type'
    if (!formData.media) newErrors.media = 'Please select media option'

    if (!formData.content_idea.trim()) {
      newErrors.content_idea = 'Please provide a content idea'
    }

    if (!formData.Post_type) newErrors.Post_type = 'Please select a post type'

    // Image_type is required only when media is "Generate"
    if (formData.media === 'Generate' && !formData.Image_type) {
      newErrors.Image_type = 'Please select an image type'
    }

    // Files are required when media is "Upload"
    if (formData.media === 'Upload') {
      if (uploadedFiles.length === 0) {
        newErrors.files = 'Please upload at least one file'
      } else {
        // Check if any files are still uploading or have errors
        const uploadingFiles = uploadedFiles.filter(f => f.uploading)
        const errorFiles = uploadedFiles.filter(f => f.error)

        if (uploadingFiles.length > 0) {
          newErrors.files = 'Please wait for all files to finish uploading'
        } else if (errorFiles.length > 0) {
          newErrors.files = 'Some files failed to upload. Please remove them and try again'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Get uploaded file URLs (files are already uploaded when selected)
      const uploadedFileUrls = uploadedFiles
        .filter(file => file.url && !file.error) // Only include successfully uploaded files
        .map(file => ({
          url: file.url,
          name: file.name,
          type: file.type,
          size: file.size
        }))

      // Convert form data to payload format expected by backend
      const payload = {
        channel: formData.channel,
        platform: formData.platform,
        content_type: formData.content_type,
        media: formData.media,
        content_idea: formData.content_idea.trim(),
        Post_type: formData.Post_type,
        ...(formData.media === 'Generate' && { Image_type: formData.Image_type }),
        ...(uploadedFileUrls.length > 0 && { uploaded_files: uploadedFileUrls })
      }

      await onSubmit(payload)
      onClose()
    } catch (error) {
      console.error('Error submitting form:', error)
      setErrors({ submit: 'Failed to create post. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const uploadFilesToServer = async (files) => {
    const uploadedUrls = []

    for (const fileObj of files) {
      try {
        setUploadProgress(prev => ({ ...prev, [fileObj.id]: 0 }))

        const formDataUpload = new FormData()
        formDataUpload.append('file', fileObj.file)

        const token = localStorage.getItem('authToken')
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/upload-file`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataUpload
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        const result = await response.json()
        uploadedUrls.push({
          url: result.url,
          name: fileObj.name,
          type: fileObj.type,
          size: fileObj.size
        })

        setUploadProgress(prev => ({ ...prev, [fileObj.id]: 100 }))

      } catch (error) {
        console.error(`Failed to upload ${fileObj.name}:`, error)
        setErrors(prev => ({
          ...prev,
          submit: `Failed to upload ${fileObj.name}. Please try again.`
        }))
        throw error
      }
    }

    return uploadedUrls
  }

  const channelOptions = [
    { label: 'Social Media', value: 'Social Media' },
    { label: 'Blog', value: 'Blog' }
  ]

  const platformOptions = [
    { label: 'Instagram', value: 'Instagram' },
    { label: 'Facebook', value: 'Facebook' },
    { label: 'LinkedIn', value: 'LinkedIn' },
    { label: 'YouTube', value: 'YouTube' }
  ]

  const contentTypeOptions = [
    { label: 'Static Post', value: 'static_post' },
    { label: 'Carousel', value: 'carousel' },
    { label: 'Short Video/Reel', value: 'short_video or reel' },
    { label: 'Long Video', value: 'long_video' },
    { label: 'Blog Post', value: 'blog' }
  ]

  const mediaOptions = [
    { label: 'Generate Media', value: 'Generate' },
    { label: 'Upload My Own', value: 'Upload' },
    { label: 'Text Only', value: 'Without media' }
  ]

  const postTypeOptions = [
    'Educational tips',
    'Quote / motivation',
    'Promotional offer',
    'Product showcase',
    'Carousel infographic',
    'Announcement',
    'Testimonial / review',
    'Before–after',
    'Behind-the-scenes',
    'User-generated content',
    'Brand story',
    'Meme / humor',
    'Facts / did-you-know',
    'Event highlight',
    'Countdown',
    'FAQ post',
    'Comparison',
    'Case study snapshot',
    'Milestone / achievement',
    'Call-to-action post'
  ]

  const imageTypeOptions = [
    'Minimal & Clean with Bold Typography',
    'Modern Corporate / B2B Professional',
    'Luxury Editorial (Black, White, Gold Accents)',
    'Photography-Led Lifestyle Aesthetic',
    'Product-Focused Clean Commercial Style',
    'Flat Illustration with Friendly Characters',
    'Isometric / Explainer Illustration Style',
    'Playful & Youthful (Memphis / Stickers / Emojis)',
    'High-Impact Color-Blocking with Loud Type',
    'Retro / Vintage Poster Style',
    'Futuristic Tech / AI-Inspired Dark Mode',
    'Glassmorphism / Neumorphism UI Style',
    'Abstract Shapes & Fluid Gradient Art',
    'Infographic / Data-Driven Educational Layout',
    'Quote Card / Thought-Leadership Typography Post',
    'Meme-Style / Social-Native Engagement Post',
    'Festive / Campaign-Based Creative',
    'Textured Design (Paper, Grain, Handmade Feel)',
    'Magazine / Editorial Layout with Strong Hierarchy',
    'Experimental / Artistic Concept-Driven Design'
  ]

  // Get filtered platform options based on channel
  const getFilteredPlatformOptions = () => {
    if (formData.channel === 'Blog') {
      return [{ label: 'Blog', value: 'Blog' }]
    }
    return platformOptions
  }

  // Get filtered content type options based on channel and platform
  const getFilteredContentTypeOptions = () => {
    if (formData.channel === 'Blog') {
      return [{ label: 'Blog Post', value: 'blog' }]
    }

    // Social media content types
    return contentTypeOptions.filter(option => option.value !== 'blog')
  }

  // Get filtered media options based on content type and platform
  const getFilteredMediaOptions = () => {
    let filtered = [...mediaOptions]
    
    // For video content types, only show "Upload My Own" and "Text Only"
    if (formData.content_type === 'short_video or reel' || formData.content_type === 'long_video') {
      filtered = filtered.filter(option => 
        option.value === 'Upload' || option.value === 'Without media'
      )
    }
    
    // For Instagram platform, remove "Text Only" option (Instagram requires media)
    if (formData.platform === 'Instagram') {
      filtered = filtered.filter(option => option.value !== 'Without media')
    }
    
    return filtered
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl ${
        isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Design a New Post
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Channel Selection */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Channel *
            </label>
            <select
              value={formData.channel}
              onChange={(e) => handleInputChange('channel', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            >
              <option value="">Select a channel...</option>
              {channelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.channel && <p className="mt-1 text-sm text-red-500">{errors.channel}</p>}
          </div>

          {/* Platform Selection */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Platform *
            </label>
            <select
              value={formData.platform}
              onChange={(e) => handleInputChange('platform', e.target.value)}
              disabled={!formData.channel}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 disabled:bg-gray-800 disabled:text-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            >
              <option value="">
                {!formData.channel ? 'Select a channel first...' : 'Select a platform...'}
              </option>
              {getFilteredPlatformOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.platform && <p className="mt-1 text-sm text-red-500">{errors.platform}</p>}
          </div>

          {/* Content Type Selection */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Content Type *
            </label>
            <select
              value={formData.content_type}
              onChange={(e) => handleInputChange('content_type', e.target.value)}
              disabled={!formData.platform}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 disabled:bg-gray-800 disabled:text-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            >
              <option value="">
                {!formData.platform ? 'Select a platform first...' : 'Select content type...'}
              </option>
              {getFilteredContentTypeOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.content_type && <p className="mt-1 text-sm text-red-500">{errors.content_type}</p>}
          </div>

          {/* Media Selection */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Media *
            </label>
            <select
              value={formData.media}
              onChange={(e) => handleInputChange('media', e.target.value)}
              disabled={!formData.content_type}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 disabled:bg-gray-800 disabled:text-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            >
              <option value="">
                {!formData.content_type ? 'Select content type first...' : 'Select media option...'}
              </option>
              {getFilteredMediaOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.media && <p className="mt-1 text-sm text-red-500">{errors.media}</p>}
          </div>

          {/* Content Idea */}
          <div className="col-span-1 md:col-span-2">
            <label className={`block text-sm font-medium mb-3 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Content Idea *
            </label>
            <textarea
              value={formData.content_idea}
              onChange={(e) => handleInputChange('content_idea', e.target.value)}
              placeholder="Describe your content idea in detail. What do you want to communicate? Who is your audience? What action do you want them to take?"
              rows={4}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
            <div className="flex justify-between mt-1">
              <span className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {formData.content_idea.split(/\s+/).filter(word => word.length > 0).length} words
              </span>
              {errors.content_idea && <p className="text-sm text-red-500">{errors.content_idea}</p>}
            </div>
          </div>

          {/* Post Type Selection */}
          <div className="col-span-1 md:col-span-2">
            <label className={`block text-sm font-medium mb-3 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Post Type *
            </label>
            <select
              value={formData.Post_type}
              onChange={(e) => handleInputChange('Post_type', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            >
              <option value="">Select a post type...</option>
              {postTypeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.Post_type && <p className="mt-1 text-sm text-red-500">{errors.Post_type}</p>}
          </div>

          {/* Image Type Selection - Only show when media is Generate */}
          {formData.media === 'Generate' && (
            <div className="col-span-1 md:col-span-2">
              <label className={`block text-sm font-medium mb-3 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Image Type *
              </label>
              <select
                value={formData.Image_type}
                onChange={(e) => handleInputChange('Image_type', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              >
                <option value="">Select an image style...</option>
                {imageTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.Image_type && <p className="mt-1 text-sm text-red-500">{errors.Image_type}</p>}
            </div>
          )}

          {/* File Upload Section */}
          <div className="col-span-1 md:col-span-2">
            {formData.media === 'Upload' && (
              <>
                <label className={`block text-sm font-medium mb-3 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Upload Files *
                </label>

                {/* Upload Area */}
                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDarkMode
                    ? 'border-gray-600 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <p className={`text-lg font-medium mb-2 ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Click to upload files
                    </p>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Images and videos up to 300MB each
                    </p>
                    <p className={`text-xs mt-1 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Required: Upload your media files
                    </p>
                    <p className={`text-xs mt-1 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Supported: JPEG, PNG, GIF, WebP, SVG, MP4, AVI, MOV, WMV, FLV, WebM, MKV
                    </p>
                  </label>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Uploaded Files ({uploadedFiles.length})
                    </h4>
                    <div className="space-y-2">
                      {uploadedFiles.map((fileObj) => (
                        <div
                          key={fileObj.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            fileObj.error
                              ? 'border-red-300 bg-red-50'
                              : isDarkMode
                                ? 'bg-gray-700 border-gray-600'
                                : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {getFileIcon(fileObj.type)}
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${
                                fileObj.error
                                  ? 'text-red-700'
                                  : isDarkMode ? 'text-gray-200' : 'text-gray-700'
                              }`}>
                                {fileObj.name}
                              </p>
                              <div className="flex items-center space-x-2">
                                <p className={`text-xs ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  {formatFileSize(fileObj.size)}
                                </p>
                                {fileObj.uploading && (
                                  <span className="text-xs text-blue-600 flex items-center">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                                    Uploading...
                                  </span>
                                )}
                                {fileObj.error && (
                                  <span className="text-xs text-red-600">
                                    Upload failed
                                  </span>
                                )}
                                {!fileObj.uploading && !fileObj.error && fileObj.url && (
                                  <span className="text-xs text-green-600">
                                    ✓ Uploaded
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(fileObj.id)}
                            disabled={fileObj.uploading}
                            className={`p-1 rounded-md transition-colors ${
                              fileObj.uploading
                                ? 'opacity-50 cursor-not-allowed'
                                : isDarkMode
                                  ? 'hover:bg-gray-600 text-gray-400'
                                  : 'hover:bg-gray-200 text-gray-500'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errors.files && (
                  <div className="mt-2">
                    {Array.isArray(errors.files) ? (
                      errors.files.map((error, index) => (
                        <p key={index} className="text-sm text-red-500">{error}</p>
                      ))
                    ) : (
                      <p className="text-sm text-red-500">{errors.files}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Submit Error */}
            {errors.submit && (
            <div className="col-span-1 md:col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="col-span-1 md:col-span-2 flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </div>
        </form>
      </div>
    </div>
  )
}

export default NewPostModal