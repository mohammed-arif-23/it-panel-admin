"use client";

import React, { useMemo, useState } from "react";
import CrudShell from "@/components/adminComponents/crud/CrudShell";
import { adminTables, TableConfig } from "@/components/adminComponents/crud/adminTables";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CrudHome() {
  const [tableKey, setTableKey] = useState(adminTables[0]?.table || "unified_students");
  const config = useMemo<TableConfig>(() => adminTables.find(t => t.table === tableKey) || adminTables[0], [tableKey]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-4 max-w-xs">
        <Select value={tableKey} onValueChange={setTableKey}>
          <SelectTrigger>
            <SelectValue placeholder="Select table" />
          </SelectTrigger>
          <SelectContent>
            {adminTables.map(t => (
              <SelectItem key={t.table} value={t.table}>{t.display}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {config && <CrudShell config={config} />}
    </div>
  );
}


