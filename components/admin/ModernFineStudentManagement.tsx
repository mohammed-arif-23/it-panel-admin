"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RefreshCw, Save, RotateCcw } from 'lucide-react'

interface FineStudent {
  id: string
  register_number: string
  name: string
  email: string
  class_year: string
  total_fine_amount: number
}

export default function ModernFineStudentManagement() {
  const [students, setStudents] = useState<FineStudent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({ class: 'all', search: '' })
  const [editing, setEditing] = useState<{[id: string]: number}>({})
  const [isRecalc, setIsRecalc] = useState(false)

  const fetchStudents = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('class', filters.class)
      if (filters.search) params.set('search', filters.search)
      const res = await fetch(`/api/admin/fine-students?${params.toString()}`)
      const data = await res.json()
      if (data.success) setStudents(data.data || [])
      else setStudents([])
    } catch (e) {
      setStudents([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchStudents() }, [])
  useEffect(() => { fetchStudents() }, [filters])

  const handleSave = async (id: string) => {
    const val = editing[id]
    if (val == null || val < 0) return
    try {
      const res = await fetch('/api/admin/fine-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_total', student_id: id, total: val })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setEditing(prev => { const p = { ...prev }; delete p[id]; return p })
        fetchStudents()
      } else {
        alert(`Failed to save: ${data.error || res.statusText}`)
      }
    } catch (e) {
      alert('Failed to save total')
    }
  }

  const handleRecalc = async () => {
    if (!confirm('Recalculate totals for all students from current pending fines?')) return
    setIsRecalc(true)
    try {
      const res = await fetch('/api/admin/fine-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recalc_all' })
      })
      const data = await res.json()
      if (res.ok && data.success) fetchStudents()
      else alert(`Failed to recalc: ${data.error || res.statusText}`)
    } catch (e) {
      alert('Failed to recalc totals')
    } finally {
      setIsRecalc(false)
    }
  }

  const totalOverall = useMemo(() => students.reduce((s, st) => s + (st.total_fine_amount || 0), 0), [students])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fine Students</h2>
          <p className="text-gray-600">Total fine per student with quick edit and recalculation</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStudents} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin"/> : <RefreshCw className="h-4 w-4 mr-2"/>}
            Refresh
          </Button>
          <Button onClick={handleRecalc} disabled={isRecalc} variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
            {isRecalc ? <RefreshCw className="h-4 w-4 mr-2 animate-spin"/> : <RotateCcw className="h-4 w-4 mr-2"/>}
            Recalculate Totals
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter by class and search by name/register number</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Class</Label>
              <Select value={filters.class} onValueChange={(v) => setFilters(prev => ({...prev, class: v}))}>
                <SelectTrigger className="mt-2 bg-white">
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="II-IT">II-IT</SelectItem>
                  <SelectItem value="III-IT">III-IT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Search</Label>
              <Input value={filters.search} onChange={(e) => setFilters(prev => ({...prev, search: e.target.value}))} placeholder="Name or Register No." className="mt-2 bg-white"/>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>Total pending fine per student</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Register No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Total Fine (₹)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{s.register_number}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.class_year}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{s.email}</TableCell>
                    <TableCell className="text-right">
                      {editing[s.id] != null ? (
                        <Input type="number" min={0} value={editing[s.id]} onChange={(e) => setEditing(prev => ({...prev, [s.id]: Number(e.target.value)}))} className="w-28"/>
                      ) : (
                        `₹${s.total_fine_amount || 0}`
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editing[s.id] != null ? (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleSave(s.id)}>
                          <Save className="h-3 w-3 mr-1"/> Save
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setEditing(prev => ({...prev, [s.id]: s.total_fine_amount || 0}))}>
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="text-sm text-gray-600 mt-4">Overall total pending fines: ₹{totalOverall}</div>
        </CardContent>
      </Card>
    </div>
  )
}
