'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  Hash, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  RefreshCw,
  Database,
  FileText
} from 'lucide-react'

interface HashGenerationStats {
  total_submissions: number
  with_hash: number
  without_hash: number
  completion_percentage: number
}

interface HashGenerationResult {
  success: boolean
  message: string
  processed: number
  errors: number
  total: number
  results?: any[]
}

export default function PlagiarismDetection() {
  const [selectedAssignment, setSelectedAssignment] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [stats, setStats] = useState<HashGenerationStats | null>(null)
  const [result, setResult] = useState<HashGenerationResult | null>(null)
  const [error, setError] = useState<string>('')

  // Load statistics on component mount
  useEffect(() => {
    loadHashStats()
  }, [selectedAssignment])

  const loadHashStats = async () => {
    setIsLoadingStats(true)
    setError('')
    
    try {
      const url = selectedAssignment 
        ? `/api/admin/generate-hashes?assignment_id=${selectedAssignment}`
        : '/api/admin/generate-hashes'
        
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setStats(data.statistics)
      } else {
        setError(data.error || 'Failed to load hash statistics')
      }
    } catch (err) {
      setError('Failed to load hash statistics')
      console.error('Error loading hash stats:', err)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const generateHashes = async () => {
    if (!selectedAssignment) {
      setError('Please select an assignment first')
      return
    }

    setIsGenerating(true)
    setError('')
    setResult(null)
    
    try {
      const response = await fetch('/api/admin/generate-hashes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          assignment_id: selectedAssignment,
          batch_size: 5 // Process in small batches
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResult(data)
        // Reload stats after generation
        await loadHashStats()
      } else {
        setError(data.error || 'Failed to generate hashes')
      }
    } catch (err) {
      setError('Failed to generate hashes')
      console.error('Error generating hashes:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateAllHashes = async () => {
    setIsGenerating(true)
    setError('')
    setResult(null)
    
    try {
      const response = await fetch('/api/admin/generate-hashes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          batch_size: 10 // Process all assignments
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResult(data)
        // Reload stats after generation
        await loadHashStats()
      } else {
        setError(data.error || 'Failed to generate hashes')
      }
    } catch (err) {
      setError('Failed to generate hashes')
      console.error('Error generating hashes:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Plagiarism Detection System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Generate file hashes for existing submissions to enable plagiarism detection. 
            New submissions are automatically checked for duplicates.
          </p>
          
          {/* Assignment Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Assignment (Optional)
            </label>
            <input
              type="text"
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
              placeholder="Enter assignment ID or leave empty for all assignments"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-4">
            <Button
              onClick={generateHashes}
              disabled={isGenerating || !selectedAssignment}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Hash className="h-4 w-4" />
              )}
              Generate Hashes for Assignment
            </Button>
            
            <Button
              onClick={generateAllHashes}
              disabled={isGenerating}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              Generate All Hashes
            </Button>
            
            <Button
              onClick={loadHashStats}
              disabled={isLoadingStats}
              variant="ghost"
              className="flex items-center gap-2"
            >
              {isLoadingStats ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh Stats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Hash Generation Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total_submissions}</div>
                <div className="text-sm text-blue-600">Total Submissions</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.with_hash}</div>
                <div className="text-sm text-green-600">With Hash</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.without_hash}</div>
                <div className="text-sm text-orange-600">Without Hash</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.completion_percentage}%</div>
                <div className="text-sm text-purple-600">Complete</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{stats.completion_percentage}%</span>
              </div>
              <Progress value={stats.completion_percentage} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.errors > 0 ? (
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              Generation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={result.errors > 0 ? "destructive" : "default"}>
                  {result.errors > 0 ? "Completed with Errors" : "Successfully Completed"}
                </Badge>
                <span className="text-sm text-gray-600">
                  {result.processed} processed, {result.errors} errors
                </span>
              </div>
              
              <p className="text-sm text-gray-700">{result.message}</p>
              
              {result.errors > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Some submissions failed to process. Check the server logs for details.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

    </div>
  )
}
