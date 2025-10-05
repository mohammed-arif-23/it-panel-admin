import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '../../../../lib/auth';

// Check admin authentication using JWT
async function checkAdminAuth(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) return false;
    
    const payload = await verifyJWT(token);
    return payload.role === 'HOD' || payload.role === 'STAFF';
  } catch (error) {
    console.error('JWT verification error:', error);
    return false;
  }
}

// Define table columns mapping
const tableColumns = {
  unified_students: [
    { name: 'id', type: 'string', displayName: 'ID' },
    { name: 'register_number', type: 'string', displayName: 'Register Number' },
    { name: 'name', type: 'string', displayName: 'Name' },
    { name: 'email', type: 'string', displayName: 'Email' },
    { name: 'mobile', type: 'string', displayName: 'Mobile' },
    { name: 'class_year', type: 'string', displayName: 'Class Year' },
    { name: 'password', type: 'string', displayName: 'Password' },
    { name: 'created_at', type: 'timestamp', displayName: 'Created At' },
    { name: 'updated_at', type: 'timestamp', displayName: 'Updated At' }
  ],
  unified_seminar_bookings: [
    { name: 'id', type: 'string', displayName: 'ID' },
    { name: 'student_id', type: 'string', displayName: 'Student ID' },
    { name: 'booking_date', type: 'date', displayName: 'Booking Date' },
    { name: 'seminar_topic', type: 'string', displayName: 'Seminar Topic' },
    { name: 'created_at', type: 'timestamp', displayName: 'Created At' }
  ],
  unified_seminar_selections: [
    { name: 'id', type: 'string', displayName: 'ID' },
    { name: 'student_id', type: 'string', displayName: 'Student ID' },
    { name: 'seminar_date', type: 'date', displayName: 'Seminar Date' },
    { name: 'selected_at', type: 'timestamp', displayName: 'Selected At' }
  ],
  assignments: [
    { name: 'id', type: 'string', displayName: 'ID' },
    { name: 'title', type: 'string', displayName: 'Title' },
    { name: 'description', type: 'string', displayName: 'Description' },
    { name: 'class_year', type: 'string', displayName: 'Class Year' },
    { name: 'due_date', type: 'timestamp', displayName: 'Due Date' },
    { name: 'created_at', type: 'timestamp', displayName: 'Created At' },
    { name: 'updated_at', type: 'timestamp', displayName: 'Updated At' }
  ],
  assignment_submissions: [
    { name: 'id', type: 'string', displayName: 'ID' },
    { name: 'assignment_id', type: 'string', displayName: 'Assignment ID' },
    { name: 'student_id', type: 'string', displayName: 'Student ID' },
    { name: 'file_url', type: 'string', displayName: 'File URL' },
    { name: 'file_name', type: 'string', displayName: 'File Name' },
    { name: 'marks', type: 'number', displayName: 'Marks' },
    { name: 'status', type: 'enum', displayName: 'Status' },
    { name: 'submitted_at', type: 'timestamp', displayName: 'Submitted At' },
    { name: 'graded_at', type: 'timestamp', displayName: 'Graded At' },
    { name: 'feedback', type: 'string', displayName: 'Feedback' }
  ],
  ii_it_students: [
    { name: 'id', type: 'string', displayName: 'ID' },
    { name: 'register_number', type: 'string', displayName: 'Register Number' },
    { name: 'student_name', type: 'string', displayName: 'Student Name' },
    { name: 'email', type: 'string', displayName: 'Email' },
    { name: 'mobile', type: 'string', displayName: 'Mobile' },
    { name: 'class_name', type: 'string', displayName: 'Class Name' },
    { name: 'nptel_course_name', type: 'string', displayName: 'NPTEL Course Name' },
    { name: 'nptel_course_id', type: 'string', displayName: 'NPTEL Course ID' },
    { name: 'course_duration', type: 'string', displayName: 'Course Duration' },
    ...Array.from({ length: 12 }, (_, i) => ({
      name: `week_${i + 1}_status`,
      type: 'string',
      displayName: `Week ${i + 1} Status`
    })),
    ...Array.from({ length: 12 }, (_, i) => ({
      name: `week_${i + 1}_updated_at`,
      type: 'timestamp',
      displayName: `Week ${i + 1} Updated At`
    })),
    { name: 'created_at', type: 'timestamp', displayName: 'Created At' }
  ],
  iii_it_students: [
    { name: 'id', type: 'string', displayName: 'ID' },
    { name: 'register_number', type: 'string', displayName: 'Register Number' },
    { name: 'student_name', type: 'string', displayName: 'Student Name' },
    { name: 'email', type: 'string', displayName: 'Email' },
    { name: 'mobile', type: 'string', displayName: 'Mobile' },
    { name: 'class_name', type: 'string', displayName: 'Class Name' },
    { name: 'nptel_course_name', type: 'string', displayName: 'NPTEL Course Name' },
    { name: 'nptel_course_id', type: 'string', displayName: 'NPTEL Course ID' },
    { name: 'course_duration', type: 'string', displayName: 'Course Duration' },
    ...Array.from({ length: 12 }, (_, i) => ({
      name: `week_${i + 1}_status`,
      type: 'string',
      displayName: `Week ${i + 1} Status`
    })),
    ...Array.from({ length: 12 }, (_, i) => ({
      name: `week_${i + 1}_updated_at`,
      type: 'timestamp',
      displayName: `Week ${i + 1} Updated At`
    })),
    { name: 'created_at', type: 'timestamp', displayName: 'Created At' }
  ]
};

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tables } = await request.json();
    
    if (!tables || tables.length === 0) {
      return NextResponse.json({ error: 'No tables specified' }, { status: 400 });
    }

    let allColumns: any[] = [];

    tables.forEach((tableName: string) => {
      if (tableColumns[tableName as keyof typeof tableColumns]) {
        const columns = tableColumns[tableName as keyof typeof tableColumns];
        allColumns = allColumns.concat(
          columns.map(col => ({
            ...col,
            table: tableName,
            fullName: `${tableName}.${col.name}`
          }))
        );
      }
    });

    return NextResponse.json({ 
      columns: allColumns,
      tables: tables
    });

  } catch (error) {
    console.error('Error fetching table columns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch columns' },
      { status: 500 }
    );
  }
}