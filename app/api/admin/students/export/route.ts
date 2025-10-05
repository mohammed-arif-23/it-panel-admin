import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import * as XLSX from 'xlsx';
import { verifyJWT } from '../../../../../lib/auth';

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

// POST - Export students to Excel
export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { ids } = await request.json();

    let studentsData;
    
    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Export specific students
      const { data, error } = await (supabaseAdmin as any)
        .from('unified_students')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching students for export:', error);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
      }

      studentsData = data;
    } else {
      // Export all students
      const { data, error } = await (supabaseAdmin as any)
        .from('unified_students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all students for export:', error);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
      }

      studentsData = data;
    }

    // Prepare data for Excel
    const exportData = studentsData.map((student: any) => ({
      'Register Number': student.register_number,
      'Name': student.name,
      'Email': student.email,
      'Mobile': student.mobile,
      'Class Year': student.class_year,
      'Email Verified': student.email_verified ? 'Yes' : 'No',
      'Created At': new Date(student.created_at).toLocaleString(),
      'Updated At': new Date(student.updated_at).toLocaleString()
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    // Generate buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Create response with Excel file
    const headers = new Headers();
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.append('Content-Disposition', `attachment; filename="students-export-${new Date().toISOString().split('T')[0]}.xlsx"`);

    return new NextResponse(wbout, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}