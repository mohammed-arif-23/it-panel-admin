'use client'

import { useState, useRef } from 'react'
import { ArrowLeft, Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SubjectItem {
  code: string
  name: string
  staff?: string | null
  internal?: string | null
}

interface NotesUploadData {
  department: string
  year: string
  semester: string
  subject: SubjectItem
}

interface NotesUploadStepProps {
  data: NotesUploadData
  onBack: () => void
  onReset: () => void
}

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

export function NotesUploadStep({ data, onBack, onReset }: NotesUploadStepProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: UploadFile[] = Array.from(selectedFiles).map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0
    }))

    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFiles = async () => {
    try {
      if (files.length === 0) return

      setUploading(true)
      
      // Create organized folder structure like QPS system
      const sanitize = (s: string) => s
        .trim()
        .replace(/&/g, 'and')
        .replace(/[^A-Za-z0-9 _().\-]/g, '')
        .replace(/\s+/g, '_')
      
      // Create hierarchical folder: notes/department/year/semester/subject_code
      const folderSafe = `notes/${sanitize(data.department)}/${sanitize(data.year)}/${sanitize(data.semester)}/${sanitize(data.subject.code)}`

      // sign once per folder
      const signRes = await fetch('/api/cloudinary/sign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: folderSafe })
      })
      const sign = await signRes.json()
      if (!signRes.ok || sign.error) throw new Error(sign.error || 'Failed to sign upload')

      const results = [] as any[]
      
      for (const fileItem of files) {
        if (fileItem.status !== 'pending') continue

        try {
          // Update status to uploading
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, status: 'uploading', progress: 10 } : f
          ))

          const fd = new FormData()
          fd.append('file', fileItem.file)
          fd.append('api_key', sign.apiKey)
          fd.append('timestamp', sign.timestamp)
          fd.append('signature', sign.signature)
          fd.append('folder', sign.folder)
          fd.append('use_filename', sign.use_filename)
          fd.append('unique_filename', sign.unique_filename)

          const upRes = await fetch(sign.uploadUrl, { method: 'POST', body: fd })
          const up = await upRes.json()
          if (!upRes.ok || up.error) throw new Error(up.error?.message || 'Upload failed')
          
          results.push(up)
          
          // Update status to success
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f
          ))

        } catch (error) {
          // Update status to error
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { 
              ...f, 
              status: 'error', 
              progress: 0, 
              error: error instanceof Error ? error.message : 'Upload failed' 
            } : f
          ))
        }
      }

      // Refresh file list if needed
      // fetchNotesFiles(data.subject.code)
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'border-blue-200 bg-blue-50'
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-gray-200 bg-white'
    }
  }

  const allUploaded = files.length > 0 && files.every(f => f.status === 'success')
  const hasErrors = files.some(f => f.status === 'error')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Selection</span>
        </button>
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
            <Upload className="w-7 h-7 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Upload Notes</h3>
          <p className="text-xs text-gray-600 mt-1">{data.subject.code} - {data.subject.name}</p>
        </div>
        <div className="w-16"></div>
      </div>

      {/* Selection Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Upload Details</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600 text-xs">Department</span>
            <p className="font-medium text-gray-900">{data.department}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600 text-xs">Year</span>
            <p className="font-medium text-gray-900">{data.year}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600 text-xs">Semester</span>
            <p className="font-medium text-gray-900">{data.semester}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600 text-xs">Subject</span>
            <p className="font-medium text-gray-900">{data.subject.code}</p>
          </div>
        </div>
      </div>

      {/* File Upload Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-purple-400 hover:bg-purple-50 transition-colors cursor-pointer"
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Upload Notes Files</h4>
            <p className="text-gray-600 mb-4">Click to select files or drag and drop</p>
            <p className="text-sm text-gray-500">Supported formats: PDF, DOC, DOCX, PPT, PPTX</p>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <h5 className="font-medium text-gray-900">Selected Files ({files.length})</h5>
            {files.map((fileItem) => (
              <div key={fileItem.id} className={`p-4 rounded-lg border ${getStatusColor(fileItem.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(fileItem.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{fileItem.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {fileItem.error && (
                        <p className="text-xs text-red-600 mt-1">{fileItem.error}</p>
                      )}
                    </div>
                  </div>
                  {fileItem.status === 'pending' && (
                    <button
                      onClick={() => removeFile(fileItem.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {fileItem.status === 'uploading' && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fileItem.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && !allUploaded && (
          <div className="mt-6 flex space-x-3">
            <Button
              onClick={uploadFiles}
              disabled={uploading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </>
              )}
            </Button>
          </div>
        )}

        {/* Success/Error Actions */}
        {allUploaded && (
          <div className="mt-6 text-center">
            <div className="mb-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-2" />
              <h4 className="text-lg font-medium text-gray-900 mb-1">Upload Complete!</h4>
              <p className="text-gray-600">All notes files have been uploaded successfully.</p>
            </div>
            <div className="flex space-x-3">
              <Button onClick={onReset} variant="outline" className="flex-1">
                Upload More Files
              </Button>
              <Button onClick={onBack} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}

        {hasErrors && !uploading && (
          <div className="mt-6">
            <Button
              onClick={() => {
                // Retry failed uploads
                setFiles(prev => prev.map(f => 
                  f.status === 'error' ? { ...f, status: 'pending', error: undefined } : f
                ))
              }}
              variant="outline"
              className="w-full"
            >
              Retry Failed Uploads
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}