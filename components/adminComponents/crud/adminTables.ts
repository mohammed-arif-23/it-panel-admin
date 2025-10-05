export type ColumnConfig = {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'select' | 'boolean'
  readOnly?: boolean
  hidden?: boolean
}

export type TableConfig = {
  table: string
  idColumn?: string
  display: string
  defaultSort?: { column: string; asc?: boolean }
  columns: ColumnConfig[]
}

export const adminTables: TableConfig[] = [
  {
    table: 'unified_students',
    display: 'Students',
    defaultSort: { column: 'created_at', asc: false },
    columns: [
      { key: 'id', label: 'ID', readOnly: true, hidden: true },
      { key: 'register_number', label: 'Register Number' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'class_year', label: 'Class Year', type: 'select' },
      { key: 'created_at', label: 'Created At', readOnly: true },
      { key: 'updated_at', label: 'Updated At', readOnly: true }
    ]
  },
  {
    table: 'assignments',
    display: 'Assignments',
    defaultSort: { column: 'created_at', asc: false },
    columns: [
      { key: 'id', label: 'ID', readOnly: true, hidden: true },
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'due_date', label: 'Due Date', type: 'date' },
      { key: 'created_at', label: 'Created At', readOnly: true },
      { key: 'updated_at', label: 'Updated At', readOnly: true }
    ]
  },
  {
    table: 'unified_student_fines',
    display: 'Student Fines',
    defaultSort: { column: 'created_at', asc: false },
    columns: [
      { key: 'id', label: 'ID', readOnly: true, hidden: true },
      { key: 'student_id', label: 'Student ID' },
      { key: 'fine_type', label: 'Fine Type' },
      { key: 'reference_date', label: 'Reference Date', type: 'date' },
      { key: 'base_amount', label: 'Base Amount', type: 'number' },
      { key: 'payment_status', label: 'Payment Status' },
      { key: 'paid_amount', label: 'Paid Amount', type: 'number' },
      { key: 'created_at', label: 'Created At', readOnly: true }
    ]
  }
]


