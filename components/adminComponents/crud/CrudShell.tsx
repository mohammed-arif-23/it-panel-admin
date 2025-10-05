"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, RefreshCw, Save, X, Trash2, Search, Download, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal } from "lucide-react";
import type { TableConfig } from "./adminTables";
import { exportArrayToExcel } from "@/lib/exportExcel";

type Props = {
  config: TableConfig
};

export default function CrudShell({ config }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<string>(config.defaultSort?.column || (config.columns[0]?.key || 'created_at'));
  const [sortAsc, setSortAsc] = useState<boolean>(config.defaultSort?.asc ?? false);
  const [columnsDialog, setColumnsDialog] = useState<boolean>(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(config.columns.filter(c => !c.hidden).map(c => c.key));

  const visibleColumns = useMemo(() => config.columns.filter(c => !c.hidden), [config.columns]);

  useEffect(() => {
    fetchData();
  }, [config.table, sortBy, sortAsc]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ table: config.table, limit: "100", orderBy: sortBy, orderAsc: String(sortAsc) });
      const res = await fetch(`/api/admin/generic-crud?${params}`);
      const data = await res.json();
      setRows(Array.isArray(data.data) ? data.data : []);
      setCount(data.count || 0);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({});
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setFormData(row);
    setModalOpen(true);
  };

  const onDelete = async (row: any) => {
    if (!confirm("Delete this record?")) return;
    await fetch("/api/admin/generic-crud", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: config.table, id: row[config.idColumn || "id"], idColumn: config.idColumn || "id" })
    });
    fetchData();
  };

  const onSave = async () => {
    const body = editing
      ? { table: config.table, id: formData[config.idColumn || "id"], idColumn: config.idColumn || "id", values: sanitize(formData) }
      : { table: config.table, values: sanitize(formData) };
    await fetch("/api/admin/generic-crud", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setModalOpen(false);
    fetchData();
  };

  const sanitize = (data: Record<string, any>) => {
    const out: Record<string, any> = {};
    for (const col of config.columns) {
      if (col.readOnly) continue;
      if (data[col.key] === undefined) continue;
      out[col.key] = data[col.key];
    }
    return out;
  };

  const filtered = useMemo(() => {
    if (!search) return rows;
    const lower = search.toLowerCase();
    return rows.filter(r => JSON.stringify(r).toLowerCase().includes(lower));
  }, [rows, search]);

  const doExport = () => {
    const headers: Record<string, string> = {};
    for (const c of config.columns) headers[c.key] = c.label;
    exportArrayToExcel(filtered, config.display.replace(/\s+/g, '_').toLowerCase(), selectedColumns, headers);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold">{config.display}</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input className="pl-9" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setColumnsDialog(true)}>
            <SlidersHorizontal className="h-4 w-4 mr-2" /> Columns
          </Button>
          <Button variant="outline" onClick={doExport}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{count} records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No data</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map(c => (
                      <TableHead
                        key={c.key}
                        className="cursor-pointer select-none"
                        onClick={() => {
                          if (sortBy === c.key) setSortAsc(!sortAsc); else { setSortBy(c.key); setSortAsc(true); }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {c.label}
                          {sortBy === c.key ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, idx) => (
                    <TableRow key={idx}>
                      {visibleColumns.map(c => (
                        <TableCell key={c.key}>{formatCell(row[c.key])}</TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => onDelete(row)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Create'} {config.display}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {config.columns.filter(c => !c.readOnly && !c.hidden).map(c => (
              <div key={c.key}>
                <label className="text-sm text-gray-700">{c.label}</label>
                <Input
                  value={formData[c.key] ?? ''}
                  onChange={(e) => setFormData({ ...formData, [c.key]: e.target.value })}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button onClick={onSave}>
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Columns selection dialog */}
      <Dialog open={columnsDialog} onOpenChange={setColumnsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select columns</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {config.columns.filter(c => !c.hidden).map(c => {
              const checked = selectedColumns.includes(c.key);
              return (
                <label key={c.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedColumns(prev => Array.from(new Set([...prev, c.key])));
                      else setSelectedColumns(prev => prev.filter(k => k !== c.key));
                    }}
                  />
                  {c.label}
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setColumnsDialog(false)}>Close</Button>
            <Button onClick={() => { setColumnsDialog(false); doExport(); }}>
              <Download className="h-4 w-4 mr-2" /> Export Selected
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatCell(value: any) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}


