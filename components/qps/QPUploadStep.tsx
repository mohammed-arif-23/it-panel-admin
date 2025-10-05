'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, X, FileText, Loader2, CheckCircle, AlertCircle, Trash2, ArrowLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'

interface SubjectItem {
  code: string
  name: string
  staff?: string | null
  internal?: string | null
}

interface CloudinaryFile {
  public_id: string
  format: string
  url: string
  bytes: number
  created_at: string
  filename: string
  folder: string
  resource_type: string
}

interface QPUploadData {
  department: string
  year: string
  subject: SubjectItem
}

interface QPUploadStepProps {
  data: QPUploadData
  onNext: (data: any) => void
  onBack: () => void
}

export function QPUploadStep({ data, onNext, onBack }: QPUploadStepProps) {
  const [filesQueued, setFilesQueued] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string>('')
  
  const [cloudFiles, setCloudFiles] = useState<CloudinaryFile[]>([])
  const [loadingList, setLoadingList] = useState(false)
  
  const dropRef = useRef<HTMLDivElement | null>(null)

  const fetchCloudFiles = async (subjectCode: string) => {
    try {
      setLoadingList(true)
      const res = await fetch(`/api/qps/list?subject=${encodeURIComponent(subjectCode)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to list files')
      setCloudFiles(json.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (data.subject?.code) {
      fetchCloudFiles(data.subject.code)
    }
  }, [data.subject?.code])

  // Drag & Drop handlers
  useEffect(() => {
    const el = dropRef.current
    if (!el) return
    
    const onDragOver = (e: DragEvent) => { 
      e.preventDefault()
      el.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50')
    }
    const onDragLeave = () => { 
      el.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50')
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      el.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50')
      const dt = e.dataTransfer
      if (dt?.files?.length) {
        setFilesQueued(prev => [...prev, ...Array.from(dt.files)])
      }
    }
    
    el.addEventListener('dragover', onDragOver as any)
    el.addEventListener('dragleave', onDragLeave as any)
    el.addEventListener('drop', onDrop as any)
    
    return () => {
      el.removeEventListener('dragover', onDragOver as any)
      el.removeEventListener('dragleave', onDragLeave as any)
      el.removeEventListener('drop', onDrop as any)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setFilesQueued(prev => [...prev, ...Array.from(files)])
    }
  }, [])

  const removeFile = (index: number) => {
    setFilesQueued(prev => prev.filter((_, i) => i !== index))
  }

  const onUploadAll = async () => {
    try {
      setError('')
      setMessage('')
      if (!data.subject?.code) throw new Error('Subject not selected')
      if (filesQueued.length === 0) throw new Error('Add files to upload')

      // sanitize folder from subject code to ensure Cloudinary accepts it
      const sanitize = (s: string) => s
        .trim()
        .replace(/&/g, 'and')
        .replace(/[^A-Za-z0-9 _().\-]/g, '')
        .replace(/\s+/g, '_')
      const folderSafe = `questionpapers/${sanitize(data.subject.code)}`

      // sign once per folder
      const signRes = await fetch('/api/cloudinary/sign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: folderSafe })
      })
      const sign = await signRes.json()
      if (!signRes.ok || sign.error) throw new Error(sign.error || 'Failed to sign upload')

      setUploading(true)
      const results = [] as any[]
      
      for (const f of filesQueued) {
        const fd = new FormData()
        fd.append('file', f)
        fd.append('api_key', sign.apiKey)
        fd.append('timestamp', sign.timestamp)
        fd.append('signature', sign.signature)
        fd.append('folder', sign.folder)
        fd.append('use_filename', sign.use_filename)
        fd.append('unique_filename', sign.unique_filename)

        // track per-file progress
        setUploadProgress(p => ({ ...p, [f.name]: 10 }))
        setMessage(`Uploading ${f.name}...`)
        
        const upRes = await fetch(sign.uploadUrl, { method: 'POST', body: fd })
        const up = await upRes.json()
        if (!upRes.ok || up.error) throw new Error(up.error?.message || 'Upload failed')
        
        results.push(up)
        setUploadProgress(p => ({ ...p, [f.name]: 100 }))
      }

      setMessage(`✅ Uploaded ${results.length} file(s) successfully!`)
      setFilesQueued([])
      
      // Refresh file list
      await fetchCloudFiles(data.subject.code)
      
      // Auto proceed to success after 2 seconds
      setTimeout(() => {
        onNext({ uploadedFiles: results.length })
      }, 2000)
      
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
      setUploadProgress({})
    }
  }

  const onDelete = async (public_id: string) => {
    try {
      setError('')
      const res = await fetch('/api/qps/delete', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ public_id }) 
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed')
      
      await fetchCloudFiles(data.subject.code)
    } catch (e: any) { 
      setError(e.message) 
    }
  }

  const onRename = async (public_id: string) => {
    const newName = prompt('Enter new file name (without folder):')
    if (!newName) return
    
    try {
      setError('')
      const res = await fetch('/api/qps/rename', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ public_id, new_name: newName }) 
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Rename failed')
      
      await fetchCloudFiles(data.subject.code)
    } catch (e: any) { 
      setError(e.message) 
    }
  }

  const prettySize = (b: number) => {
    if (b < 1024) return `${b} B`
    if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`
    return `${(b/1024/1024).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-[var(--color-text-muted)] hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
            <Upload className="w-7 h-7 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-[var(--color-primary)]">Upload Question Papers</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{data.subject.code} - {data.subject.name}</p>
        </div>
        <div className="w-16"></div>
      </div>

      {/* Selection Summary */}
      <div className="saas-card p-4">
        <h4 className="font-semibold text-[var(--color-primary)] mb-3">Selected Details</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-[var(--color-text-muted)]">Department:</span>
            <p className="font-medium text-[var(--color-primary)]">{data.department}</p>
          </div>
          <div>
            <span className="text-[var(--color-text-muted)]">Year:</span>
            <p className="font-medium text-[var(--color-primary)]">{data.year}</p>
          </div>
          <div>
            <span className="text-[var(--color-text-muted)]">Subject:</span>
            <p className="font-medium text-[var(--color-primary)]">{data.subject.code}</p>
          </div>
        </div>
      </div>

      {/* Upload Guidelines */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100 shadow-sm">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 bg-white rounded-xl shadow-sm flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-bold text-blue-900 mb-3 text-sm">Upload Guidelines</h4>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                <span className="text-sm text-blue-700">PDF, DOC, DOCX, JPG, PNG files accepted</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                <span className="text-sm text-blue-700">Maximum file size: 10MB per file</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                <span className="text-sm text-blue-700">Use clear, descriptive filenames</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div className="saas-card p-6">
        <div 
          ref={dropRef} 
          className="border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl p-8 text-center transition-all hover:shadow-md"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          <label className="block text-base font-semibold text-[var(--color-primary)] mb-2">
            Choose Files or Drag & Drop
          </label>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Select multiple question paper files to upload
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            disabled={uploading}
            className="w-full text-sm text-[var(--color-text-muted)] file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-600 file:to-indigo-600 file:text-white hover:file:from-blue-700 hover:file:to-indigo-700 file:cursor-pointer file:transition-all file:shadow-sm disabled:opacity-50"
          />
        </div>

        {/* Queued Files */}
        {filesQueued.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-[var(--color-primary)] mb-3">
              Files to Upload ({filesQueued.length})
            </h4>
            <div className="space-y-3">
              {filesQueued.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-[var(--color-accent)] rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-primary)]">{file.name}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">{prettySize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {uploadProgress[file.name] && (
                      <span className="text-sm text-blue-600">{uploadProgress[file.name]}%</span>
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                onClick={onUploadAll}
                disabled={uploading || filesQueued.length === 0}
                className="saas-button-primary flex items-center space-x-2 ripple"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload All Files</span>
                  </>
                )}
              </Button>
              <button
                onClick={() => setFilesQueued([])}
                disabled={uploading}
                className="saas-button-secondary"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && Object.keys(uploadProgress).length > 0 && (
        <div className="saas-card p-4">
          <h4 className="font-semibold text-[var(--color-primary)] mb-3">Upload Progress</h4>
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--color-text-secondary)]">{filename}</span>
                <span className="text-blue-600 font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* Existing Files */}
      <div className="saas-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-[var(--color-primary)]">Existing Question Papers</h4>
          <button
            onClick={() => fetchCloudFiles(data.subject.code)}
            className="text-sm text-blue-600 hover:underline"
          >
            Refresh
          </button>
        </div>
        
        {loadingList ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  <Skeleton className="w-8 h-8 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="w-8 h-8 rounded" />
                  <Skeleton className="w-8 h-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : cloudFiles.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">No question papers found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cloudFiles.map(file => (
              <div key={file.public_id} className="flex items-center justify-between p-4 bg-[var(--color-accent)] rounded-xl hover:shadow-md transition-all">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-medium text-[var(--color-primary)] hover:underline"
                    >
                      {file.filename}.{file.format}
                    </a>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {prettySize(file.bytes)} • {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onRename(file.public_id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(file.public_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {message && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-600">{message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
