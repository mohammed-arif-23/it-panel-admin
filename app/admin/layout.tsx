import type { Metadata } from 'next'
import AdminAuthGuard from '@/components/admin/AdminAuthGuard'

export const metadata: Metadata = {
  title: 'Admin Panel - College Management System',
  description: 'Administrative panel for database management and export',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminAuthGuard>
      {children}
    </AdminAuthGuard>
  )
}