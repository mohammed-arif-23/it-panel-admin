"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface StaffItem {
  name: string;
  designation: string;
  position: string;
  imageUrl: string;
}

interface DepartmentInfo {
  vision: string[];
  mission: string[];
  staff: StaffItem[];
}

export default function DepartmentInfoAdminPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Textarea state holds newline-separated strings; API expects arrays
  const [visionText, setVisionText] = useState('');
  const [missionText, setMissionText] = useState('');
  const [staff, setStaff] = useState<StaffItem[]>([]);

  const [jsonPayload, setJsonPayload] = useState('');

  const jsonTemplate = useMemo(
    () =>
      JSON.stringify(
        {
          vision: [
            'To become a center of excellence in technology and innovation...',
            'To empower students with cutting-edge skills...',
          ],
          mission: [
            'Provide quality education and foster research.',
            'Nurture leadership and ethical responsibility.',
          ],
          staff: [
            {
              name: 'Dr. Jane Doe',
              designation: 'Professor',
              position: 'Head of Department',
              imageUrl: 'https://example.com/jane.jpg',
            },
          ],
        },
        null,
        2
      ),
    []
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/admin/department-info', { method: 'GET' });
        if (!res.ok) throw new Error('Failed to fetch department info');
        const json = await res.json();
        const data: DepartmentInfo = json.data || { vision: [], mission: [], staff: [] };
        setVisionText(Array.isArray(data.vision) ? (data.vision as string[]).join('\n') : '');
        setMissionText(Array.isArray(data.mission) ? (data.mission as string[]).join('\n') : '');
        setStaff(Array.isArray(data.staff) ? data.staff : []);
        setJsonPayload(
          JSON.stringify(
            { vision: data.vision || [], mission: data.mission || [], staff: data.staff || [] },
            null,
            2
          )
        );
      } catch (e: any) {
        setError(e?.message || 'Error loading data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveFromFields = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/admin/department-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vision: visionText
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
          mission: missionText
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
          staff,
        }),
      });
      if (!res.ok) throw new Error('Failed to save department info');
      setSuccess('Department info saved');
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFromJson = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      let parsed: any;
      try {
        parsed = JSON.parse(jsonPayload);
      } catch (e) {
        throw new Error('Invalid JSON');
      }
      const res = await fetch('/api/admin/department-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payloadJson: parsed }),
      });
      if (!res.ok) throw new Error('Failed to save department info');
      setSuccess('Department info saved');
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateStaffField = (index: number, key: keyof StaffItem, value: string) => {
    setStaff((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value } as StaffItem;
      return copy;
    });
  };

  const removeStaff = (index: number) => {
    setStaff((prev) => prev.filter((_, i) => i !== index));
  };

  const addStaff = () => {
    setStaff((prev) => [...prev, { name: '', designation: '', position: '', imageUrl: '' }]);
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Department Info</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="fields">
            <TabsList className="mb-4">
              <TabsTrigger value="fields">Form</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="fields">
              <div className="grid gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Vision (one per line)</label>
                  <Textarea
                    value={visionText}
                    onChange={(e) => setVisionText(e.target.value)}
                    placeholder="Enter department vision"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Mission (one per line)</label>
                  <Textarea
                    value={missionText}
                    onChange={(e) => setMissionText(e.target.value)}
                    placeholder="Enter department mission"
                    rows={4}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Staff</label>
                    <Button type="button" onClick={addStaff} variant="secondary" size="sm">
                      + Add Staff
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {staff.map((s, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 border rounded-lg bg-muted/30">
                        <Input
                          placeholder="Name"
                          value={s.name}
                          onChange={(e) => updateStaffField(i, 'name', e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          placeholder="Designation"
                          value={s.designation}
                          onChange={(e) => updateStaffField(i, 'designation', e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          placeholder="Position"
                          value={s.position}
                          onChange={(e) => updateStaffField(i, 'position', e.target.value)}
                          className="text-sm"
                        />
                        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
                          <Input
                            placeholder="Image URL"
                            value={s.imageUrl}
                            onChange={(e) => updateStaffField(i, 'imageUrl', e.target.value)}
                            className="text-sm flex-1"
                          />
                          <Button type="button" variant="destructive" onClick={() => removeStaff(i)} size="sm" className="flex-shrink-0">
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSaveFromFields} disabled={saving || loading}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="json">
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Paste JSON matching the following template:
                </div>
                <pre className="p-3 rounded bg-muted/40 text-xs overflow-auto">{jsonTemplate}</pre>
                <Textarea
                  value={jsonPayload}
                  onChange={(e) => setJsonPayload(e.target.value)}
                  rows={18}
                  placeholder={`{\n  "vision": "...",\n  "mission": "...",\n  "staff": []\n}`}
                />
                <div>
                  <Button onClick={handleSaveFromJson} disabled={saving || loading}>
                    {saving ? 'Saving...' : 'Save JSON'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
