export interface Database {
  public: {
    Tables: {
      unified_students: {
        Row: {
          id: string
          register_number: string
          name: string | null
          email: string | null
          mobile: string | null
          class_year: string | null
          password: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          register_number: string
          name?: string | null
          email?: string | null
          mobile?: string | null
          class_year?: string | null
          password?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          register_number?: string
          name?: string | null
          email?: string | null
          mobile?: string | null
          class_year?: string | null
          password?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      unified_student_registrations: {
        Row: {
          id: string
          student_id: string
          registration_type: 'nptel' | 'seminar' | 'both'
          registration_date: string
          is_active: boolean
        }
        Insert: {
          id?: string
          student_id: string
          registration_type: 'nptel' | 'seminar' | 'both'
          registration_date?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          student_id?: string
          registration_type?: 'nptel' | 'seminar' | 'both'
          registration_date?: string
          is_active?: boolean
        }
      }
      unified_nptel_enrollments: {
        Row: {
          id: string
          student_id: string
          course_name: string
          course_id: string
          course_duration: number
          enrollment_date: string
          is_active: boolean
        }
        Insert: {
          id?: string
          student_id: string
          course_name: string
          course_id: string
          course_duration?: number
          enrollment_date?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          student_id?: string
          course_name?: string
          course_id?: string
          course_duration?: number
          enrollment_date?: string
          is_active?: boolean
        }
      }
      unified_nptel_progress: {
        Row: {
          id: string
          enrollment_id: string
          week_number: number
          status: 'not_started' | 'in_progress' | 'completed'
          updated_at: string
        }
        Insert: {
          id?: string
          enrollment_id: string
          week_number: number
          status?: 'not_started' | 'in_progress' | 'completed'
          updated_at?: string
        }
        Update: {
          id?: string
          enrollment_id?: string
          week_number?: number
          status?: 'not_started' | 'in_progress' | 'completed'
          updated_at?: string
        }
      }
      unified_seminar_bookings: {
        Row: {
          id: string
          student_id: string
          booking_date: string
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          booking_date: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          booking_date?: string
          created_at?: string
        }
      }
      unified_seminar_selections: {
        Row: {
          id: string
          student_id: string
          seminar_date: string
          selected_at: string
          class_year: string | null
        }
        Insert: {
          id?: string
          student_id: string
          seminar_date: string
          selected_at?: string
          class_year?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          seminar_date?: string
          selected_at?: string
          class_year?: string | null
        }
      }
      unified_seminar_attendance: {
        Row: {
          id: string
          student_id: string
          seminar_date: string
          attendance_status: 'present' | 'absent' | 'excused' | 'pending'
          attendance_time: string | null
          notes: string | null
          seminar_topic: string | null
          marked_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          seminar_date: string
          attendance_status?: 'present' | 'absent' | 'excused' | 'pending'
          attendance_time?: string | null
          notes?: string | null
          seminar_topic?: string | null
          marked_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          seminar_date?: string
          attendance_status?: 'present' | 'absent' | 'excused' | 'pending'
          attendance_time?: string | null
          notes?: string | null
          seminar_topic?: string | null
          marked_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          title: string
          description: string | null
          due_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          due_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          due_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      assignment_submissions: {
        Row: {
          id: string
          assignment_id: string
          student_id: string
          file_url: string
          file_name: string
          marks: number | null
          status: 'submitted' | 'graded'
          submitted_at: string
          graded_at: string | null
          feedback: string | null
        }
        Insert: {
          id?: string
          assignment_id: string
          student_id: string
          file_url: string
          file_name: string
          marks?: number | null
          status?: 'submitted' | 'graded'
          submitted_at?: string
          graded_at?: string | null
          feedback?: string | null
        }
        Update: {
          id?: string
          assignment_id?: string
          student_id?: string
          file_url?: string
          file_name?: string
          marks?: number | null
          status?: 'submitted' | 'graded'
          submitted_at?: string
          graded_at?: string | null
          feedback?: string | null
        }
      }
      // Legacy NPTEL tables from original project
      ii_it_students: {
        Row: {
          id: string
          register_number: string
          student_name: string
          email: string
          mobile: string
          class_name: string
          nptel_course_name: string
          nptel_course_id: string
          course_duration: string
          week_1_status: string
          week_2_status: string
          week_3_status: string
          week_4_status: string
          week_5_status: string
          week_6_status: string
          week_7_status: string
          week_8_status: string
          week_9_status: string
          week_10_status: string
          week_11_status: string
          week_12_status: string
          week_1_updated_at?: string
          week_2_updated_at?: string
          week_3_updated_at?: string
          week_4_updated_at?: string
          week_5_updated_at?: string
          week_6_updated_at?: string
          week_7_updated_at?: string
          week_8_updated_at?: string
          week_9_updated_at?: string
          week_10_updated_at?: string
          week_11_updated_at?: string
          week_12_updated_at?: string
          created_at: string
        }
        Insert: {
          id?: string
          register_number: string
          student_name: string
          email: string
          mobile: string
          class_name: string
          nptel_course_name: string
          nptel_course_id: string
          course_duration: string
          week_1_status?: string
          week_2_status?: string
          week_3_status?: string
          week_4_status?: string
          week_5_status?: string
          week_6_status?: string
          week_7_status?: string
          week_8_status?: string
          week_9_status?: string
          week_10_status?: string
          week_11_status?: string
          week_12_status?: string
          week_1_updated_at?: string
          week_2_updated_at?: string
          week_3_updated_at?: string
          week_4_updated_at?: string
          week_5_updated_at?: string
          week_6_updated_at?: string
          week_7_updated_at?: string
          week_8_updated_at?: string
          week_9_updated_at?: string
          week_10_updated_at?: string
          week_11_updated_at?: string
          week_12_updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          register_number?: string
          student_name?: string
          email?: string
          mobile?: string
          class_name?: string
          nptel_course_name?: string
          nptel_course_id?: string
          course_duration?: string
          week_1_status?: string
          week_2_status?: string
          week_3_status?: string
          week_4_status?: string
          week_5_status?: string
          week_6_status?: string
          week_7_status?: string
          week_8_status?: string
          week_9_status?: string
          week_10_status?: string
          week_11_status?: string
          week_12_status?: string
          week_1_updated_at?: string
          week_2_updated_at?: string
          week_3_updated_at?: string
          week_4_updated_at?: string
          week_5_updated_at?: string
          week_6_updated_at?: string
          week_7_updated_at?: string
          week_8_updated_at?: string
          week_9_updated_at?: string
          week_10_updated_at?: string
          week_11_updated_at?: string
          week_12_updated_at?: string
          created_at?: string
        }
      }
      iii_it_students: {
        Row: {
          id: string
          register_number: string
          student_name: string
          email: string
          mobile: string
          class_name: string
          nptel_course_name: string
          nptel_course_id: string
          course_duration: string
          week_1_status: string
          week_2_status: string
          week_3_status: string
          week_4_status: string
          week_5_status: string
          week_6_status: string
          week_7_status: string
          week_8_status: string
          week_9_status: string
          week_10_status: string
          week_11_status: string
          week_12_status: string
          week_1_updated_at?: string
          week_2_updated_at?: string
          week_3_updated_at?: string
          week_4_updated_at?: string
          week_5_updated_at?: string
          week_6_updated_at?: string
          week_7_updated_at?: string
          week_8_updated_at?: string
          week_9_updated_at?: string
          week_10_updated_at?: string
          week_11_updated_at?: string
          week_12_updated_at?: string
          created_at: string
        }
        Insert: {
          id?: string
          register_number: string
          student_name: string
          email: string
          mobile: string
          class_name: string
          nptel_course_name: string
          nptel_course_id: string
          course_duration: string
          week_1_status?: string
          week_2_status?: string
          week_3_status?: string
          week_4_status?: string
          week_5_status?: string
          week_6_status?: string
          week_7_status?: string
          week_8_status?: string
          week_9_status?: string
          week_10_status?: string
          week_11_status?: string
          week_12_status?: string
          week_1_updated_at?: string
          week_2_updated_at?: string
          week_3_updated_at?: string
          week_4_updated_at?: string
          week_5_updated_at?: string
          week_6_updated_at?: string
          week_7_updated_at?: string
          week_8_updated_at?: string
          week_9_updated_at?: string
          week_10_updated_at?: string
          week_11_updated_at?: string
          week_12_updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          register_number?: string
          student_name?: string
          email?: string
          mobile?: string
          class_name?: string
          nptel_course_name?: string
          nptel_course_id?: string
          course_duration?: string
          week_1_status?: string
          week_2_status?: string
          week_3_status?: string
          week_4_status?: string
          week_5_status?: string
          week_6_status?: string
          week_7_status?: string
          week_8_status?: string
          week_9_status?: string
          week_10_status?: string
          week_11_status?: string
          week_12_status?: string
          week_1_updated_at?: string
          week_2_updated_at?: string
          week_3_updated_at?: string
          week_4_updated_at?: string
          week_5_updated_at?: string
          week_6_updated_at?: string
          week_7_updated_at?: string
          week_8_updated_at?: string
          week_9_updated_at?: string
          week_10_updated_at?: string
          week_11_updated_at?: string
          week_12_updated_at?: string
          created_at?: string
        }
      }
      // Legacy seminar tables from original project
      seminar_students: {
        Row: {
          id: string
          reg_number: string
          created_at: string
        }
        Insert: {
          id?: string
          reg_number: string
          created_at?: string
        }
        Update: {
          id?: string
          reg_number?: string
          created_at?: string
        }
      }
      seminar_bookings: {
        Row: {
          id: string
          student_id: string
          booking_date: string
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          booking_date: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          booking_date?: string
          created_at?: string
        }
      }
      seminar_selections: {
        Row: {
          id: string
          student_id: string
          seminar_date: string
          selected_at: string
        }
        Insert: {
          id?: string
          student_id: string
          seminar_date: string
          selected_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          seminar_date?: string
          selected_at?: string
        }
      }
      // Admin and system tables
      unified_student_fines: {
        Row: {
          id: string
          student_id: string
          fine_type: string
          reference_id: string | null
          reference_date: string
          base_amount: number
          daily_increment: number
          days_overdue: number
          payment_status: 'pending' | 'paid' | 'waived'
          paid_amount: number | null
          paid_at: string | null
          waived_by: string | null
          waived_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          fine_type: string
          reference_id?: string | null
          reference_date: string
          base_amount?: number
          daily_increment?: number
          days_overdue?: number
          payment_status?: 'pending' | 'paid' | 'waived'
          paid_amount?: number | null
          paid_at?: string | null
          waived_by?: string | null
          waived_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          fine_type?: string
          reference_id?: string | null
          reference_date?: string
          base_amount?: number
          daily_increment?: number
          days_overdue?: number
          payment_status?: 'pending' | 'paid' | 'waived'
          paid_amount?: number | null
          paid_at?: string | null
          waived_by?: string | null
          waived_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      unified_holidays: {
        Row: {
          id: string
          holiday_name: string
          holiday_date: string
          holiday_type: string
          description: string | null
          is_announced: boolean
          announced_date: string | null
          created_by: string
          affects_seminars: boolean
          affects_assignments: boolean
          affects_exams: boolean
          reschedule_rules: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          holiday_name: string
          holiday_date: string
          holiday_type: string
          description?: string | null
          is_announced?: boolean
          announced_date?: string | null
          created_by: string
          affects_seminars?: boolean
          affects_assignments?: boolean
          affects_exams?: boolean
          reschedule_rules?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          holiday_name?: string
          holiday_date?: string
          holiday_type?: string
          description?: string | null
          is_announced?: boolean
          announced_date?: string | null
          created_by?: string
          affects_seminars?: boolean
          affects_assignments?: boolean
          affects_exams?: boolean
          reschedule_rules?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      unified_blocked_registrations: {
        Row: {
          id: string
          register_number: string | null
          email: string | null
          mobile: string | null
          block_type: string
          block_reason: string
          blocked_until: string | null
          is_permanent: boolean
          appeal_status: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          register_number?: string | null
          email?: string | null
          mobile?: string | null
          block_type: string
          block_reason: string
          blocked_until?: string | null
          is_permanent?: boolean
          appeal_status?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          register_number?: string | null
          email?: string | null
          mobile?: string | null
          block_type?: string
          block_reason?: string
          blocked_until?: string | null
          is_permanent?: boolean
          appeal_status?: string | null
          ip_address?: string | null
          created_at?: string
        }
      }
      unified_registration_attempts: {
        Row: {
          id: string
          register_number: string
          email: string | null
          mobile: string | null
          name: string | null
          class_year: string | null
          attempt_status: string
          otp_verification_id: string | null
          final_student_id: string | null
          ip_address: string | null
          user_agent: string | null
          browser_fingerprint: string | null
          device_info: any | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          register_number: string
          email?: string | null
          mobile?: string | null
          name?: string | null
          class_year?: string | null
          attempt_status: string
          otp_verification_id?: string | null
          final_student_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          browser_fingerprint?: string | null
          device_info?: any | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          register_number?: string
          email?: string | null
          mobile?: string | null
          name?: string | null
          class_year?: string | null
          attempt_status?: string
          otp_verification_id?: string | null
          final_student_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          browser_fingerprint?: string | null
          device_info?: any | null
          completed_at?: string | null
          created_at?: string
        }
      }
      unified_email_change_history: {
        Row: {
          id: string
          student_id: string
          new_email: string
          change_reason: string
          verification_method: string
          otp_verification_id: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          new_email: string
          change_reason: string
          verification_method: string
          otp_verification_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          new_email?: string
          change_reason?: string
          verification_method?: string
          otp_verification_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      unified_duplicate_detection_logs: {
        Row: {
          id: string
          register_number: string
          email: string | null
          mobile: string | null
          detection_type: string
          attempted_registration_data: any
          action_taken: string
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          register_number: string
          email?: string | null
          mobile?: string | null
          detection_type: string
          attempted_registration_data: any
          action_taken: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          register_number?: string
          email?: string | null
          mobile?: string | null
          detection_type?: string
          attempted_registration_data?: any
          action_taken?: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      // Holiday and calendar management tables
      unified_academic_calendar: {
        Row: {
          id: string
          event_name: string
          event_type: string
          start_date: string
          end_date: string | null
          class_year: string | null
          department: string
          is_fixed: boolean
          priority_level: number
          description: string | null
          recurring_pattern: string | null
          created_by: string
          status: string
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_name: string
          event_type: string
          start_date: string
          end_date?: string | null
          class_year?: string | null
          department?: string
          is_fixed?: boolean
          priority_level?: number
          description?: string | null
          recurring_pattern?: string | null
          created_by: string
          status?: string
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_name?: string
          event_type?: string
          start_date?: string
          end_date?: string | null
          class_year?: string | null
          department?: string
          is_fixed?: boolean
          priority_level?: number
          description?: string | null
          recurring_pattern?: string | null
          created_by?: string
          status?: string
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      unified_holiday_impact_assessments: {
        Row: {
          id: string
          holiday_id: string
          impact_type: string
          affected_count: number
          impact_severity: string
          created_at: string
        }
        Insert: {
          id?: string
          holiday_id: string
          impact_type: string
          affected_count: number
          impact_severity: string
          created_at?: string
        }
        Update: {
          id?: string
          holiday_id?: string
          impact_type?: string
          affected_count?: number
          impact_severity?: string
          created_at?: string
        }
      }
      unified_seminar_reschedule_history: {
        Row: {
          id: string
          holiday_id: string | null
          original_date: string
          new_date: string
          seminar_topic: string
          class_year: string
          reschedule_reason: string
          reschedule_type: string
          affected_students_count: number
          affected_bookings_count: number
          status: string
          rescheduled_by: string
          auto_reschedule_rules: any | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          holiday_id?: string | null
          original_date: string
          new_date: string
          seminar_topic: string
          class_year: string
          reschedule_reason: string
          reschedule_type: string
          affected_students_count: number
          affected_bookings_count: number
          status?: string
          rescheduled_by: string
          auto_reschedule_rules?: any | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          holiday_id?: string | null
          original_date?: string
          new_date?: string
          seminar_topic?: string
          class_year?: string
          reschedule_reason?: string
          reschedule_type?: string
          affected_students_count?: number
          affected_bookings_count?: number
          status?: string
          rescheduled_by?: string
          auto_reschedule_rules?: any | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      unified_auto_reschedule_rules: {
        Row: {
          id: string
          rule_name: string
          rule_type: string
          priority: number
          reschedule_logic: any
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          rule_name: string
          rule_type: string
          priority: number
          reschedule_logic: any
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          rule_name?: string
          rule_type?: string
          priority?: number
          reschedule_logic?: any
          is_active?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type aliases for easier use
export type Student = Database['public']['Tables']['unified_students']['Row']
export type StudentInsert = Database['public']['Tables']['unified_students']['Insert']
export type StudentUpdate = Database['public']['Tables']['unified_students']['Update']

export type StudentRegistration = Database['public']['Tables']['unified_student_registrations']['Row']
export type StudentRegistrationInsert = Database['public']['Tables']['unified_student_registrations']['Insert']
export type StudentRegistrationUpdate = Database['public']['Tables']['unified_student_registrations']['Update']

export type NPTELEnrollment = Database['public']['Tables']['unified_nptel_enrollments']['Row']
export type NPTELEnrollmentInsert = Database['public']['Tables']['unified_nptel_enrollments']['Insert']
export type NPTELEnrollmentUpdate = Database['public']['Tables']['unified_nptel_enrollments']['Update']

export type NPTELProgress = Database['public']['Tables']['unified_nptel_progress']['Row']
export type NPTELProgressInsert = Database['public']['Tables']['unified_nptel_progress']['Insert']
export type NPTELProgressUpdate = Database['public']['Tables']['unified_nptel_progress']['Update']

export type SeminarBooking = Database['public']['Tables']['unified_seminar_bookings']['Row']
export type SeminarBookingInsert = Database['public']['Tables']['unified_seminar_bookings']['Insert'] & {
  seminar_topic?: string | null
}
export type SeminarBookingUpdate = Database['public']['Tables']['unified_seminar_bookings']['Update'] & {
  seminar_topic?: string | null
}

export type SeminarSelection = Database['public']['Tables']['unified_seminar_selections']['Row']
export type SeminarSelectionInsert = Database['public']['Tables']['unified_seminar_selections']['Insert']
export type SeminarSelectionUpdate = Database['public']['Tables']['unified_seminar_selections']['Update']

// Extended types with joined data
export interface StudentWithRegistrations extends Student {
  unified_student_registrations: StudentRegistration[]
}

export interface NPTELEnrollmentWithProgress extends NPTELEnrollment {
  unified_nptel_progress: NPTELProgress[]
  unified_students: Student
}

export interface SeminarBookingWithStudent extends SeminarBooking {
  students: Student
}

export interface SeminarSelectionWithStudent extends SeminarSelection {
  students: Student
}

// Application-specific types
export interface AuthState {
  user: Student | null
  loading: boolean
  registrations: StudentRegistration[]
}

export interface BookingWindowInfo {
  isOpen: boolean
  timeUntilOpen?: number
  timeUntilClose?: number
  nextOpenTime?: Date
}

export interface TodaySelection {
  student: Student
  selectedAt: string
}

export interface NPTELWeekStatus {
  week: number
  status: 'not_started' | 'in_progress' | 'completed'
  updatedAt?: string
  isLocked: boolean
  unlockTime?: Date
}

export interface DashboardData {
  student: Student
  nptelEnrollments: NPTELEnrollmentWithProgress[]
  seminarBookings: SeminarBooking[]
  upcomingSelections: SeminarSelection[]
}