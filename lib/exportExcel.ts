import * as XLSX from 'xlsx'

export function exportArrayToExcel(rows: any[], filename: string, selectedKeys?: string[], headerMap?: Record<string, string>) {
  const data = Array.isArray(rows) ? rows : []
  const keys = selectedKeys && selectedKeys.length > 0
    ? selectedKeys
    : (data[0] ? Object.keys(data[0]) : [])

  const shaped = data.map((row) => {
    const out: Record<string, any> = {}
    keys.forEach((k) => {
      const header = headerMap?.[k] ?? k
      out[header] = row?.[k]
    })
    return out
  })

  const ws = XLSX.utils.json_to_sheet(shaped.length > 0 ? shaped : [{ Message: 'No data' }])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  const safe = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, safe)
}


