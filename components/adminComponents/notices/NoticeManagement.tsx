'use client'

import React, { useState, useEffect } from 'react'
import { 
  Bell, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Search,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle,
  Upload,
  X,
  Save,
  AlertTriangle
} from 'lucide-react'
import { Button } from '../../ui/button'
import { Alert, AlertDescription } from '../../ui/alert'

interface Notice {
  id?: string
  title: string
  content: string
  notice_type: string
  priority: string
  target_audience: string
  is_published: boolean
  published_at?: string
  expires_at?: string
  attachment_url?: string
  attachment_name?: string
  views_count?: number
  created_by: string
  created_at?: string
}

const noticeTypes = [
  { value: 'general', label: 'General' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'event', label: 'Event' },
  { value: 'exam', label: 'Exam' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'academic', label: 'Academic' },
  { value: 'administrative', label: 'Administrative' },
]

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
]

const targetAudiences = [
  { value: 'all', label: 'All' },
  { value: 'students', label: 'All Students' },
  { value: 'II-IT', label: 'II-IT' },
  { value: 'III-IT', label: 'III-IT' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'staff', label: 'Staff' },
]

export default function NoticeManagement() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [filteredNotices, setFilteredNotices] = useState<Notice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info')

  const [formData, setFormData] = useState<Notice>({
    title: '',
    content: '',
    notice_type: 'general',
    priority: 'medium',
    target_audience: 'all',
    is_published: false,
    expires_at: '',
    created_by: 'admin',
  })

  useEffect(() => {
    fetchNotices()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [notices, searchQuery, filterType, filterPriority])

  const fetchNotices = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notices?include_expired=true')
      const data = await response.json()
      
      if (response.ok) {
        setNotices(data.notices || [])
      } else {
        showAlert('Failed to fetch notices', 'error')
      }
    } catch (error) {
      console.error('Error fetching notices:', error)
      showAlert('Error loading notices', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...notices]
    
    if (searchQuery) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.notice_type === filterType)
    }
    
    if (filterPriority !== 'all') {
      filtered = filtered.filter(n => n.priority === filterPriority)
    }
    
    setFilteredNotices(filtered)
  }

  const showAlert = (message: string, type: 'success' | 'error' | 'info') => {
    setAlertMessage(message)
    setAlertType(type)
    setTimeout(() => setAlertMessage(''), 5000)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingNotice ? '/api/notices' : '/api/notices'
      const method = editingNotice ? 'PUT' : 'POST'
      
      const payload = editingNotice 
        ? { ...formData, id: editingNotice.id }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        showAlert(
          editingNotice ? 'Notice updated successfully' : 'Notice created successfully',
          'success'
        )
        setShowForm(false)
        setEditingNotice(null)
        resetForm()
        fetchNotices()
      } else {
        showAlert(data.error || 'Failed to save notice', 'error')
      }
    } catch (error) {
      console.error('Error saving notice:', error)
      showAlert('Error saving notice', 'error')
    }
  }

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice)
    setFormData({
      title: notice.title,
      content: notice.content,
      notice_type: notice.notice_type,
      priority: notice.priority,
      target_audience: notice.target_audience,
      is_published: notice.is_published,
      expires_at: notice.expires_at || '',
      created_by: notice.created_by,
    })
    setShowForm(true)
  }

  const handleDelete = async (noticeId: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return

    try {
      const response = await fetch(`/api/notices?id=${noticeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        showAlert('Notice deleted successfully', 'success')
        fetchNotices()
      } else {
        showAlert('Failed to delete notice', 'error')
      }
    } catch (error) {
      console.error('Error deleting notice:', error)
      showAlert('Error deleting notice', 'error')
    }
  }

  const togglePublish = async (notice: Notice) => {
    try {
      const response = await fetch('/api/notices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: notice.id,
          is_published: !notice.is_published,
        }),
      })

      if (response.ok) {
        showAlert(
          notice.is_published ? 'Notice unpublished' : 'Notice published',
          'success'
        )
        fetchNotices()
      } else {
        showAlert('Failed to update notice', 'error')
      }
    } catch (error) {
      console.error('Error toggling publish:', error)
      showAlert('Error updating notice', 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      notice_type: 'general',
      priority: 'medium',
      target_audience: 'all',
      is_published: false,
      expires_at: '',
      created_by: 'admin',
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-primary)]">Notice Management</h2>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Create and manage college notices and announcements
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true)
            setEditingNotice(null)
            resetForm()
          }}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Notice</span>
        </Button>
      </div>

      {/* Alert */}
      {alertMessage && (
        <Alert className={`${alertType === 'success' ? 'bg-green-50 border-green-200' : alertType === 'error' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
          {alertType === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : alertType === 'error' ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-blue-600" />
          )}
          <AlertDescription className={`${alertType === 'success' ? 'text-green-900' : alertType === 'error' ? 'text-red-900' : 'text-blue-900'}`}>
            {alertMessage}
          </AlertDescription>
          <button
            onClick={() => setAlertMessage('')}
            className="absolute right-4 top-4 hover:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[var(--color-primary)]">
                {editingNotice ? 'Edit Notice' : 'Create New Notice'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingNotice(null)
                  resetForm()
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter notice title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter notice content"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    name="notice_type"
                    value={formData.notice_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {noticeTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {priorities.map(p => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience
                  </label>
                  <select
                    name="target_audience"
                    value={formData.target_audience}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {targetAudiences.map(audience => (
                      <option key={audience.value} value={audience.value}>
                        {audience.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expires At (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    name="expires_at"
                    value={formData.expires_at}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="is_published"
                  checked={formData.is_published}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  Publish immediately
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingNotice(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingNotice ? 'Update' : 'Create'} Notice</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="saas-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {noticeTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            {priorities.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notices List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading notices...</p>
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="text-center py-12 saas-card">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No notices found</p>
            <p className="text-gray-400 text-sm mt-2">Create your first notice to get started</p>
          </div>
        ) : (
          filteredNotices.map((notice) => (
            <div key={notice.id} className="saas-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`text-xs font-semibold px-3 py-1 rounded ${
                      priorities.find(p => p.value === notice.priority)?.color || 'bg-gray-500'
                    } text-white`}>
                      {notice.priority.toUpperCase()}
                    </span>
                    <span className="text-xs px-3 py-1 rounded bg-gray-200 text-gray-700">
                      {noticeTypes.find(t => t.value === notice.notice_type)?.label}
                    </span>
                    <span className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700">
                      {targetAudiences.find(a => a.value === notice.target_audience)?.label}
                    </span>
                    {notice.is_published ? (
                      <span className="flex items-center space-x-1 text-xs px-3 py-1 rounded bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        <span>Published</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-xs px-3 py-1 rounded bg-gray-100 text-gray-700">
                        <EyeOff className="w-3 h-3" />
                        <span>Draft</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-[var(--color-primary)] mb-2">
                    {notice.title}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                    {notice.content}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{notice.published_at ? formatDate(notice.published_at) : 'Not published'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>{notice.views_count || 0} views</span>
                    </div>
                    {notice.expires_at && (
                      <div className="flex items-center space-x-1 text-orange-600">
                        <AlertCircle className="w-3 h-3" />
                        <span>Expires: {formatDate(notice.expires_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => togglePublish(notice)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={notice.is_published ? 'Unpublish' : 'Publish'}
                  >
                    {notice.is_published ? (
                      <EyeOff className="w-4 h-4 text-gray-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-green-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(notice)}
                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(notice.id!)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
