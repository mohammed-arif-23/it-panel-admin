import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
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

interface SearchFilters {
  query?: string;
  classYear?: string;
  emailVerified?: boolean;
  registrationStatus?: string;
  fineStatus?: string;
  lastLoginDays?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const filters: SearchFilters = await request.json();
    const {
      query = '',
      classYear = '',
      emailVerified,
      registrationStatus = '',
      fineStatus = '',
      lastLoginDays,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      pageSize = 50
    } = filters;

    // Build the base query
    let queryBuilder = supabase
      .from('unified_students')
      .select(`
        *,
        unified_student_registrations!inner(
          registration_type,
          is_active
        ),
        unified_student_fines(
          total_amount,
          payment_status
        ),
        unified_student_activity_logs(
          activity_type,
          created_at
        )
      `, { count: 'exact' });

    // Apply text search filters
    if (query.trim()) {
      queryBuilder = queryBuilder.or(`
        name.ilike.%${query}%,
        register_number.ilike.%${query}%,
        email.ilike.%${query}%,
        mobile.ilike.%${query}%
      `);
    }

    // Apply class year filter
    if (classYear && classYear !== 'all') {
      queryBuilder = queryBuilder.eq('class_year', classYear);
    }

    // Apply email verification filter
    if (emailVerified !== undefined) {
      queryBuilder = queryBuilder.eq('email_verified', emailVerified);
    }

    // Apply registration status filter
    if (registrationStatus && registrationStatus !== 'all') {
      queryBuilder = queryBuilder.eq('unified_student_registrations.registration_type', registrationStatus);
    }

    // Apply sorting
    const validSortFields = ['name', 'register_number', 'class_year', 'created_at', 'email', 'total_fine_amount'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    queryBuilder = queryBuilder.order(sortField, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    queryBuilder = queryBuilder.range(startIndex, startIndex + pageSize - 1);

    const { data: students, error, count } = await queryBuilder;

    if (error) {
      console.error('Student search error:', error);
      return NextResponse.json(
        { error: 'Failed to search students', details: error.message },
        { status: 500 }
      );
    }

    // Process results to add computed fields
    const processedStudents = (students || []).map((student: any) => {
      // Calculate total fine amount
      const totalFines = student.unified_student_fines?.reduce(
        (sum: number, fine: any) => sum + (fine.payment_status === 'pending' ? parseFloat(fine.total_amount || 0) : 0), 
        0
      ) || 0;

      // Get last login activity
      const loginActivities = student.unified_student_activity_logs?.filter(
        (log: any) => log.activity_type === 'login'
      ) || [];
      const lastLogin = loginActivities.length > 0 
        ? new Date(Math.max(...loginActivities.map((log: any) => new Date(log.created_at).getTime())))
        : null;

      // Calculate days since last login
      const daysSinceLogin = lastLogin 
        ? Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Get registration types
      const registrationTypes = student.unified_student_registrations?.map(
        (reg: any) => reg.registration_type
      ) || [];

      return {
        ...student,
        computed_total_fines: totalFines,
        computed_last_login: lastLogin,
        computed_days_since_login: daysSinceLogin,
        computed_registration_types: registrationTypes,
        // Remove the nested arrays to clean up response
        unified_student_fines: undefined,
        unified_student_activity_logs: undefined,
        unified_student_registrations: undefined
      };
    });

    // Apply additional filters that require computed fields
    let filteredStudents = processedStudents;

    // Filter by fine status
    if (fineStatus === 'has_fines') {
      filteredStudents = filteredStudents.filter(student => student.computed_total_fines > 0);
    } else if (fineStatus === 'no_fines') {
      filteredStudents = filteredStudents.filter(student => student.computed_total_fines === 0);
    }

    // Filter by last login days
    if (lastLoginDays !== undefined) {
      filteredStudents = filteredStudents.filter(student => {
        if (student.computed_days_since_login === null) return lastLoginDays === -1; // Never logged in
        return student.computed_days_since_login <= lastLoginDays;
      });
    }

    // Calculate summary statistics
    const summary = {
      total: count || 0,
      filtered: filteredStudents.length,
      byClass: {
        'II-IT': filteredStudents.filter(s => s.class_year === 'II-IT').length,
        'III-IT': filteredStudents.filter(s => s.class_year === 'III-IT').length
      },
      emailVerified: filteredStudents.filter(s => s.email_verified).length,
      withFines: filteredStudents.filter(s => s.computed_total_fines > 0).length,
      totalFineAmount: filteredStudents.reduce((sum, s) => sum + s.computed_total_fines, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        students: filteredStudents,
        summary,
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Student search error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET method for simple queries
export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const classYear = searchParams.get('class') || '';

    // Simple search for GET requests
    const filters: SearchFilters = {
      query,
      classYear: classYear || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('limit') || '20')
    };

    // Create a POST request body and call the POST method
    const postRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(filters)
    });

    return POST(postRequest);

  } catch (error) {
    console.error('GET student search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}