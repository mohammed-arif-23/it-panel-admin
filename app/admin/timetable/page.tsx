"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, Eye } from "lucide-react";

export default function AdminTimetablePage() {
  const router = useRouter();
  const [dept, setDept] = useState<string>("INFORMATION TECHNOLOGY");
  const [className, setClassName] = useState<string>("III-IT"); // Option B
  const [apiKey, setApiKey] = useState<string>("");
  const [mode, setMode] = useState<'json' | 'table'>("json");
  const [jsonText, setJsonText] = useState<string>(`{
  "DEPARTMENT": "INFORMATION TECHNOLOGY",
  "CLASS": "III YEAR",
  "SEMESTER": "ODD SEMESTER",
  "HOURS_SLOTS": {
    "1": "9.00 - 9.55",
    "2": "9.55 - 10.50",
    "3": "11.05 - 11.55",
    "4": "11.55 - 12.45"
  },
  "TIMETABLE": {
    "MON": {
      "9.00 - 9.55": "CN",
      "9.55 - 10.50": "ES & IOT"
    }
  }
}`);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Table Builder states
  const dayCodes = ["MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
  const [periodsCount, setPeriodsCount] = useState<number>(4);
  const [slotTimes, setSlotTimes] = useState<string[]>(["9.00 - 9.55", "9.55 - 10.50", "11.05 - 11.55", "11.55 - 12.45"]);
  const [subjectsGrid, setSubjectsGrid] = useState<string[][]>([
    Array(4).fill(""),
    Array(4).fill(""),
    Array(4).fill(""),
    Array(4).fill(""),
    Array(4).fill(""),
    Array(4).fill("")
  ]);
  const [subjectDetails, setSubjectDetails] = useState<Array<{ code: string; subject: string; staff: string; room: string }>>([]);
  const [loadingCurrent, setLoadingCurrent] = useState<boolean>(false);

  const ensureGridSize = (count: number) => {
    // Adjust slotTimes
    setSlotTimes((prev) => {
      const next = [...prev];
      if (count > next.length) {
        for (let i = next.length; i < count; i++) next.push("");
      } else if (count < next.length) {
        next.length = count;
      }
      return next;
    });
    // Adjust subjectsGrid columns
    setSubjectsGrid((prev) => {
      const rows = dayCodes.length;
      const next = prev.slice(0, rows).map((row) => {
        const r = [...row];
        if (count > r.length) {
          for (let i = r.length; i < count; i++) r.push("");
        } else if (count < r.length) {
          r.length = count;
        }
        return r;
      });
      while (next.length < rows) next.push(Array(count).fill(""));
      return next;
    });
  };

  const buildJsonFromTable = () => {
    const HOURS_SLOTS: Record<string, string> = {};
    for (let i = 0; i < slotTimes.length; i++) {
      if (slotTimes[i]) HOURS_SLOTS[String(i + 1)] = slotTimes[i];
    }
    const TIMETABLE: Record<string, Record<string, string>> = {};
    dayCodes.forEach((day, r) => {
      const row: Record<string, string> = {};
      subjectsGrid[r]?.forEach((subj, c) => {
        const t = slotTimes[c];
        if (t) row[t] = subj || "";
      });
      TIMETABLE[day] = row;
    });
    // Keep JSON structure similar to student panel consumption
    const SUBJECT_DETAILS: Record<string, { Subject: string; Staff: string; Room?: string; Code?: string }> = {};
    subjectDetails.forEach((item) => {
      if (item.code) {
        SUBJECT_DETAILS[item.code] = {
          Subject: item.subject || "",
          Staff: item.staff || "",
          Room: item.room || "",
          Code: item.code,
        };
      }
    });

    const payload = {
      DEPARTMENT: dept,
      CLASS: className.split('-')[0]?.trim().toUpperCase().replace('II', 'II YEAR').replace('III', 'III YEAR').replace('IV', 'IV YEAR') || className,
      SEMESTER: "",
      HOURS_SLOTS,
      TIMETABLE,
      SUBJECT_DETAILS,
    };
    return payload;
  };

  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => row[h] = (parts[idx] || '').trim());
      rows.push(row);
    }
    return rows;
  };

  const loadCurrentFromServer = async () => {
    setMessage(null);
    setLoadingCurrent(true);
    try {
      const res = await fetch(`/api/admin/timetable?class_year=${encodeURIComponent(className)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.error || 'Failed to load current timetable' });
        return;
      }
      const j = data.data?.json || {};
      setJsonText(JSON.stringify(j, null, 2));
      // Populate table state
      const hourSlots = j.HOURS_SLOTS || {};
      const numericKeys = Object.keys(hourSlots).filter((k: string) => /^\d+$/.test(k)).sort((a: string,b: string)=>Number(a)-Number(b));
      const times = numericKeys.map((k: string) => hourSlots[k]).filter(Boolean);
      setPeriodsCount(times.length || 0);
      ensureGridSize(times.length || 0);
      setSlotTimes(times);
      const timetable = j.TIMETABLE || {};
      const grid: string[][] = dayCodes.map(() => Array(times.length || 0).fill(''));
      dayCodes.forEach((d, r) => {
        const dayObj = timetable[d] || {};
        times.forEach((t, c) => {
          grid[r][c] = dayObj[t] || '';
        });
      });
      setSubjectsGrid(grid);
      const details = j.SUBJECT_DETAILS || {};
      const detailsArr: Array<{ code: string; subject: string; staff: string; room: string }> = Object.keys(details).map((code) => ({
        code,
        subject: details[code]?.Subject || '',
        staff: details[code]?.Staff || '',
        room: details[code]?.Room || '',
      }));
      setSubjectDetails(detailsArr);
      setMode('table');
      setMessage({ type: 'info', text: 'Loaded current timetable into the table builder.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error while loading current timetable.' });
    } finally {
      setLoadingCurrent(false);
    }
  };

  const parsed = useMemo(() => {
    try {
      return JSON.parse(jsonText || "null");
    } catch {
      return null;
    }
  }, [jsonText]);

  const previewSource = useMemo(() => {
    // Use live table state to drive preview when in table mode; otherwise use parsed JSON
    if (mode === 'table') return buildJsonFromTable();
    return parsed;
  }, [mode, parsed, subjectsGrid, slotTimes, subjectDetails, periodsCount, dept, className]);

  const previewDays: Array<{ day: string; periods: Array<{ time: string; subject: string }> }> = useMemo(() => {
    if (!previewSource || !previewSource.TIMETABLE) return [];
    const daysOrder = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const hourSlots = previewSource.HOURS_SLOTS || {};
    const orderTimes: string[] = (() => {
      const numericKeys = Object.keys(hourSlots).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
      const times = numericKeys.map((k) => hourSlots[k]).filter(Boolean);
      if (times.length > 0) return times;
      const firstDay = Object.values(previewSource.TIMETABLE)[0] as Record<string, string> | undefined;
      return firstDay ? Object.keys(firstDay) : [];
    })();
    return daysOrder
      .filter((d) => previewSource.TIMETABLE[d])
      .map((d) => {
        const dayObj = previewSource.TIMETABLE[d] as Record<string, string>;
        const periods = (orderTimes.length ? orderTimes : Object.keys(dayObj)).map((t) => ({ time: t, subject: dayObj[t] || "" }));
        return { day: d, periods };
      });
  }, [previewSource]);

  const handleSubmit = async () => {
    setMessage(null);
    if (!apiKey) {
      setMessage({ type: "error", text: "Please provide ADMIN API Key." });
      return;
    }
    const toSend = mode === 'json' ? parsed : buildJsonFromTable();
    if (!toSend) {
      setMessage({ type: "error", text: "Provided JSON is invalid." });
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/timetable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-api-key": apiKey,
        },
        body: JSON.stringify({ dept, class: className, json: toSend }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "error", text: data.error || "Failed to save timetable" });
      } else {
        setMessage({ type: "success", text: "Timetable saved successfully." });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Network error while saving." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[var(--color-background)] border-b border-[var(--color-border-light)]">
        <div className="flex items-center justify-between p-4">
          <Link href="/admin" className="flex items-center space-x-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-bold text-[var(--color-primary)]">Timetable Manager</h1>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <Card className="saas-card">
          <CardHeader className="border-b border-[var(--color-border-light)]">
            <CardTitle className="text-[var(--color-primary)]">Timetable Editor</CardTitle>
            <CardDescription>
              Choose a mode: build from table or paste JSON. Class format: <strong>III-IT</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Department</label>
                <Input value={dept} onChange={(e) => setDept(e.target.value)} placeholder="INFORMATION TECHNOLOGY" />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Class (III-IT)</label>
                <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="III-IT" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Admin API Key</label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter ADMIN_API_KEY" />
            </div>
            {/* Mode Switch */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md text-sm border ${mode === 'table' ? 'bg-[var(--color-secondary)] text-white' : ''}`}
                style={{ borderColor: 'var(--color-border-light)' }}
                onClick={() => setMode('table')}
              >
                Table Builder
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md text-sm border ${mode === 'json' ? 'bg-[var(--color-secondary)] text-white' : ''}`}
                style={{ borderColor: 'var(--color-border-light)' }}
                onClick={() => setMode('json')}
              >
                JSON Paste
              </button>
            </div>

            {mode === 'json' ? (
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">JSON</label>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="w-full h-72 p-3 border rounded-lg text-sm"
                  style={{ borderColor: "var(--color-border-light)", background: "var(--color-background)", color: "var(--color-text-primary)" }}
                  spellCheck={false}
                />
                {!parsed && <p className="text-xs text-red-600 mt-1">Invalid JSON</p>}
                <div className="mt-3 flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={loadCurrentFromServer} disabled={loadingCurrent}>
                    {loadingCurrent ? 'Loading...' : 'Load Current from Server'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">Number of Periods</label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={periodsCount}
                      onChange={(e) => {
                        const v = Math.min(12, Math.max(1, parseInt(e.target.value || '1', 10)));
                        setPeriodsCount(v);
                        ensureGridSize(v);
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">Period Time Ranges</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Array.from({ length: periodsCount }).map((_, idx) => (
                        <Input
                          key={idx}
                          value={slotTimes[idx] || ''}
                          onChange={(e) => {
                            const next = [...slotTimes];
                            next[idx] = e.target.value;
                            setSlotTimes(next);
                          }}
                          placeholder={`e.g. 9.00 - 9.55 (Period ${idx + 1})`}
                        />
                      ))}
                    </div>
                    <div className="mt-2">
                      <label className="px-3 py-1.5 border rounded-md text-sm cursor-pointer inline-block" style={{ borderColor: 'var(--color-border-light)' }}>
                        Import Timetable CSV
                        <input
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const text = await file.text();
                            const rows = parseCSV(text);
                            // Expected format: first column 'Day' (MON..SAT), subsequent columns are P1..Pn subjects
                            if (rows.length === 0) return;
                            const headers = Object.keys(rows[0]);
                            const dayKey = headers.find(h => h.toLowerCase() === 'day');
                            const periodHeaders = headers.filter(h => h.toLowerCase() !== 'day');
                            if (!dayKey || periodHeaders.length === 0) {
                              setMessage({ type: 'error', text: 'CSV must have Day, P1..Pn columns.' });
                              return;
                            }
                            const newPeriods = periodHeaders.length;
                            setPeriodsCount(newPeriods);
                            ensureGridSize(newPeriods);
                            // keep existing slotTimes length in sync, but leave values as-is
                            const grid = dayCodes.map(() => Array(newPeriods).fill(''));
                            rows.forEach((r) => {
                              const d = (r[dayKey] || '').toUpperCase().slice(0,3);
                              const rIndex = dayCodes.indexOf(d as any);
                              if (rIndex >= 0) {
                                periodHeaders.forEach((ph, c) => {
                                  grid[rIndex][c] = r[ph] || '';
                                });
                              }
                            });
                            setSubjectsGrid(grid);
                            setMessage({ type: 'info', text: 'Timetable grid filled from CSV.' });
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-2">Subjects (by Day x Period)</label>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border" style={{ borderColor: 'var(--color-border-light)' }}>
                      <thead>
                        <tr>
                          <th className="px-2 py-2 text-left" style={{ color: 'var(--color-primary)' }}>Day</th>
                          {Array.from({ length: periodsCount }).map((_, i) => (
                            <th key={i} className="px-2 py-2 text-left" style={{ color: 'var(--color-primary)' }}>P{i + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dayCodes.map((d, r) => (
                          <tr key={d} className="border-t" style={{ borderColor: 'var(--color-border-light)' }}>
                            <td className="px-2 py-2 font-medium" style={{ color: 'var(--color-text-primary)' }}>{d}</td>
                            {Array.from({ length: periodsCount }).map((_, c) => (
                              <td key={`${d}-${c}`} className="px-2 py-1">
                                <Input
                                  value={subjectsGrid[r]?.[c] || ''}
                                  onChange={(e) => {
                                    const next = subjectsGrid.map(row => [...row]);
                                    if (!next[r]) next[r] = Array(periodsCount).fill('');
                                    next[r][c] = e.target.value;
                                    setSubjectsGrid(next);
                                  }}
                                  placeholder="SUBJ"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Subject Details Manager */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs text-[var(--color-text-muted)]">Subject Details (Code, Subject, Staff, Room)</label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSubjectDetails([...subjectDetails, { code: '', subject: '', staff: '', room: '' }])}
                      >
                        Add Row
                      </Button>
                      <label className="px-3 py-1.5 border rounded-md text-sm cursor-pointer" style={{ borderColor: 'var(--color-border-light)' }}>
                        Import CSV
                        <input
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const text = await file.text();
                            const rows = parseCSV(text);
                            // Expect headers: Code,Subject,Staff,Room
                            const mapped = rows.map(r => ({
                              code: r.Code || r.code || '',
                              subject: r.Subject || r.subject || '',
                              staff: r.Staff || r.staff || '',
                              room: r.Room || r.room || '',
                            })).filter(x => x.code);
                            if (mapped.length > 0) setSubjectDetails(mapped);
                          }}
                        />
                      </label>
                      <Button type="button" variant="outline" onClick={loadCurrentFromServer} disabled={loadingCurrent}>
                        {loadingCurrent ? 'Loading...' : 'Load Current'}
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border" style={{ borderColor: 'var(--color-border-light)' }}>
                      <thead>
                        <tr>
                          <th className="px-2 py-2 text-left" style={{ color: 'var(--color-primary)' }}>Code</th>
                          <th className="px-2 py-2 text-left" style={{ color: 'var(--color-primary)' }}>Subject</th>
                          <th className="px-2 py-2 text-left" style={{ color: 'var(--color-primary)' }}>Staff</th>
                          <th className="px-2 py-2 text-left" style={{ color: 'var(--color-primary)' }}>Room</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectDetails.map((row, idx) => (
                          <tr key={idx} className="border-t" style={{ borderColor: 'var(--color-border-light)' }}>
                            <td className="px-2 py-1"><Input value={row.code} onChange={(e) => {
                              const next = [...subjectDetails]; next[idx] = { ...next[idx], code: e.target.value }; setSubjectDetails(next);
                            }} placeholder="CN" /></td>
                            <td className="px-2 py-1"><Input value={row.subject} onChange={(e) => {
                              const next = [...subjectDetails]; next[idx] = { ...next[idx], subject: e.target.value }; setSubjectDetails(next);
                            }} placeholder="Computer Networks" /></td>
                            <td className="px-2 py-1"><Input value={row.staff} onChange={(e) => {
                              const next = [...subjectDetails]; next[idx] = { ...next[idx], staff: e.target.value }; setSubjectDetails(next);
                            }} placeholder="Dr. Smith" /></td>
                            <td className="px-2 py-1"><Input value={row.room} onChange={(e) => {
                              const next = [...subjectDetails]; next[idx] = { ...next[idx], room: e.target.value }; setSubjectDetails(next);
                            }} placeholder="B-203" /></td>
                            <td className="px-2 py-1 text-right">
                              <Button type="button" variant="outline" onClick={() => {
                                const next = [...subjectDetails]; next.splice(idx, 1); setSubjectDetails(next);
                              }}>Remove</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    className="saas-button-primary"
                    onClick={() => {
                      const built = buildJsonFromTable();
                      setJsonText(JSON.stringify(built, null, 2));
                      setMode('json');
                      setMessage({ type: 'info', text: 'Converted from table to JSON. You can edit further or Save.' });
                    }}
                  >
                    Convert to JSON
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save Directly'}
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button onClick={handleSubmit} disabled={submitting || !parsed} className="saas-button-primary">
                <Upload className="h-4 w-4 mr-2" />
                {submitting ? "Saving..." : "Save Timetable"}
              </Button>
            </div>
            {message && (
              <div className={`text-sm mt-2 ${message.type === "success" ? "text-green-700" : message.type === "error" ? "text-red-700" : "text-[var(--color-text-secondary)]"}`}>
                {message.text}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="saas-card">
          <CardHeader className="border-b border-[var(--color-border-light)]">
            <CardTitle className="text-[var(--color-primary)] flex items-center gap-2">
              <Eye className="h-4 w-4" /> Preview
            </CardTitle>
            <CardDescription>Quick view of days and periods</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {!previewSource ? (
              <div className="text-sm text-[var(--color-text-muted)]">Paste valid JSON to preview.</div>
            ) : previewDays.length === 0 ? (
              <div className="text-sm text-[var(--color-text-muted)]">No timetable days found.</div>
            ) : (
              previewDays.map((d) => (
                <div key={d.day} className="border rounded-lg" style={{ borderColor: "var(--color-border-light)" }}>
                  <div className="px-3 py-2 font-semibold" style={{ color: "var(--color-primary)" }}>{d.day}</div>
                  <div className="divide-y" style={{ borderColor: "var(--color-border-light)" }}>
                    {d.periods.map((p, idx) => (
                      <div key={idx} className="px-3 py-2 flex items-center justify-between text-sm">
                        <span className="text-[var(--color-text-secondary)]">{p.time}</span>
                        <div className="text-right">
                          <div className="font-medium text-[var(--color-text-primary)]">{p.subject || "-"}</div>
                          {(() => {
                            const det = (previewSource?.SUBJECT_DETAILS || {})[p.subject];
                            if (!det) return null;
                            return (
                              <div className="text-xs text-[var(--color-text-muted)]">
                                {(det.Staff ? det.Staff : '')}{det.Room ? ` • ${det.Room}` : ''}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
