'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { 
  LogOut, 
  Menu, 
  X, 
  BookOpen, 
  DollarSign, 
  Database, 
  Users, 
  Calendar, 
  BarChart3,
  CalendarDays,
  UserPlus,
  Search
} from 'lucide-react'

interface ModernAdminNavbarProps {
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
  activeTab: string
  setActiveTab: (tab: string) => void
  onLogout: () => void
}

export default function ModernAdminNavbar({ 
  isMobileMenuOpen, 
  setIsMobileMenuOpen, 
  activeTab,
  setActiveTab,
  onLogout 
}: ModernAdminNavbarProps) {
  const navigationItems = [
    { id: 'assignments', label: 'Assignments', icon: BookOpen },
    { id: 'detect-assignments', label: 'Detect Plagiarism', icon: Search },
    { id: 'registration', label: 'Registration', icon: UserPlus },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'holidays', label: 'Holidays', icon: CalendarDays },
    { id: 'Seminar History', label: 'Seminar History', icon: Users },
    { id: 'fines', label: 'Fines', icon: DollarSign },
    { id: 'fine-students', label: 'Fine Students', icon: DollarSign },
    { id: 'database', label: 'Database', icon: Database }
  ]

  const handleNavigation = (sectionId: string) => {
    setActiveTab(sectionId)
    setIsMobileMenuOpen(false) // Close mobile menu after selection
  }

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="w-full max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-16">{/* more compact */}
          {/* Logo */}
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 leading-tight">Admin Panel</h1>
              <p className="text-xs text-gray-500 hidden sm:block">System Management Dashboard</p>
            </div>
          </div>

          {/* Desktop Navigation (condensed) */}
          <div className="hidden md:flex flex-wrap items-center gap-2 max-w-full">
            {navigationItems.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeTab === id ? 'default' : 'ghost'}
                onClick={() => setActiveTab(id)}
                className={`${activeTab === id 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                } px-4 py-2 rounded-lg text-sm`}
              >
                <Icon className="h-4 w-4 mr-2" />
                <span className="leading-none">{label}</span>
              </Button>
            ))}
            <div className="h-6 w-px bg-gray-300 mx-2" />
            <Button
              variant="outline"
              onClick={onLogout}
              className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg text-sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="leading-none">Logout</span>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-600"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {navigationItems.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant={activeTab === id ? 'default' : 'outline'}
                  onClick={() => handleNavigation(id)}
                  className={`${activeTab === id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600'
                  } justify-start h-10`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={onLogout}
              className="w-full justify-start h-10 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
