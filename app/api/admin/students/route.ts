import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { adminErrorHandler } from '../../../../lib/adminErrorHandler';
import { auditLogger, AuditActions, AuditResources } from '../../../../lib/auditLogger';
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

// Get admin user info from JWT
async function getAdminUserInfo(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return { userId: 'unknown', userRole: 'UNKNOWN' };
    }
    
    const payload = await verifyJWT(token);
    return {
      userId: payload.role, // Using role as user ID for now
      userRole: payload.role
    };
  } catch (error) {
    console.error('Error getting admin user info:', error);
    return { userId: 'unknown', userRole: 'UNKNOWN' };
  }
}

// Validate student data
function validateStudentData(data: any) {
  const errors: string[] = [];

  if (!data.register_number || data.register_number.length !== 12) {
    errors.push('Register number must be exactly 12 digits');
  }

  if (!/^\d{12}$/.test(data.register_number)) {
    errors.push('Register number must contain only digits');
  }

  if (!data.name?.trim()) {
    errors.push('Name is required');
  }

  if (!data.email?.trim()) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Please enter a valid email address');
  }

  const validClassYears = ['II-IT', 'III-IT'];
  if (!validClassYears.includes(data.class_year)) {
    errors.push('Invalid class year. Must be II-IT, III-IT');
  }

  return errors;
}

// POST - Create new student
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { userId, userRole } = await getAdminUserInfo(request);
  
  if (!(await checkAdminAuth(request))) {
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.CREATE,
      AuditResources.STUDENT,
      'Unauthorized access attempt',
      undefined,
      { endpoint: '/api/admin/students', method: 'POST' },
      startTime
    );
    
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, ...studentData } = body;

    if (action !== 'create') {
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.CREATE,
        AuditResources.STUDENT,
        'Invalid action',
        undefined,
        { action, endpoint: '/api/admin/students', method: 'POST' },
        startTime
      );
      
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Validate student data
    const validationErrors = validateStudentData(studentData);
    if (validationErrors.length > 0) {
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.CREATE,
        AuditResources.STUDENT,
        'Validation failed: ' + validationErrors.join(', '),
        undefined,
        { studentData, endpoint: '/api/admin/students', method: 'POST' },
        startTime
      );
      
      return NextResponse.json({ error: validationErrors.join(', ') }, { status: 400 });
    }

    // Check for duplicates
    const { data: existingStudent, error: checkError } = await (supabaseAdmin as any)
      .from('unified_students')
      .select('id, register_number, email')
      .or(`register_number.eq.${studentData.register_number},email.eq.${studentData.email.toLowerCase()}`)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing student:', checkError);
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.CREATE,
        AuditResources.STUDENT,
        'Database error while checking duplicates',
        undefined,
        { error: checkError.message, endpoint: '/api/admin/students', method: 'POST' },
        startTime
      );
      
      return NextResponse.json({ error: 'Failed to check existing student records' }, { status: 500 });
    }

    if (existingStudent) {
      let errorMessage = '';
      if (existingStudent.register_number === studentData.register_number) {
        errorMessage = 'A student with this register number already exists';
      }
      if (existingStudent.email === studentData.email.toLowerCase()) {
        errorMessage = 'A student with this email address already exists';
      }
      
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.CREATE,
        AuditResources.STUDENT,
        errorMessage,
        existingStudent.id,
        { studentData, endpoint: '/api/admin/students', method: 'POST' },
        startTime
      );
      
      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }

    // Create the student record
    const { data: newStudent, error: insertError } = await (supabaseAdmin as any)
      .from('unified_students')
      .insert({
        register_number: studentData.register_number,
        name: studentData.name.trim(),
        email: studentData.email.toLowerCase().trim(),
        mobile: studentData.mobile?.trim() || null,
        class_year: studentData.class_year,
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating student:', insertError);
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.CREATE,
        AuditResources.STUDENT,
        'Database error while creating student',
        undefined,
        { error: insertError.message, endpoint: '/api/admin/students', method: 'POST' },
        startTime
      );
      
      // Use error handler for more detailed error response
      const errorContext = {
        code: insertError.code,
        statusCode: 500,
        endpoint: '/api/admin/students',
        method: 'POST',
        userAction: 'create_student'
      };
      
      const actionableError = adminErrorHandler.handle(new Error('Failed to create student record'), errorContext);
      return NextResponse.json({ error: actionableError.message }, { status: 500 });
    }

    auditLogger.logSuccess(
      userId,
      userRole,
      AuditActions.CREATE,
      AuditResources.STUDENT,
      newStudent.id,
      { studentData, endpoint: '/api/admin/students', method: 'POST' },
      startTime
    );

    return NextResponse.json({
      success: true,
      message: 'Student created successfully',
      data: newStudent
    });

  } catch (error: any) {
    console.error('Student creation error:', error);
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.CREATE,
      AuditResources.STUDENT,
      error.message || 'Unknown error',
      undefined,
      { error: error.message, endpoint: '/api/admin/students', method: 'POST' },
      startTime
    );
    
    // Use error handler for more detailed error response
    const errorContext = {
      code: error.code,
      statusCode: 500,
      endpoint: '/api/admin/students',
      method: 'POST',
      userAction: 'create_student'
    };
    
    const actionableError = adminErrorHandler.handle(error, errorContext);
    return NextResponse.json(
      { error: actionableError.message, details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Update existing student
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const { userId, userRole } = await getAdminUserInfo(request);
  
  if (!(await checkAdminAuth(request))) {
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.UPDATE,
      AuditResources.STUDENT,
      'Unauthorized access attempt',
      undefined,
      { endpoint: '/api/admin/students', method: 'PUT' },
      startTime
    );
    
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...studentData } = body;

    if (!id) {
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.UPDATE,
        AuditResources.STUDENT,
        'Student ID is required',
        undefined,
        { endpoint: '/api/admin/students', method: 'PUT' },
        startTime
      );
      
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Validate student data
    const validationErrors = validateStudentData(studentData);
    if (validationErrors.length > 0) {
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.UPDATE,
        AuditResources.STUDENT,
        'Validation failed: ' + validationErrors.join(', '),
        id,
        { studentData, endpoint: '/api/admin/students', method: 'PUT' },
        startTime
      );
      
      return NextResponse.json({ error: validationErrors.join(', ') }, { status: 400 });
    }

    // Check for duplicates (excluding current student)
    const { data: existingStudent, error: checkError } = await (supabaseAdmin as any)
      .from('unified_students')
      .select('id, register_number, email')
      .or(`register_number.eq.${studentData.register_number},email.eq.${studentData.email.toLowerCase()}`)
      .neq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing student:', checkError);
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.UPDATE,
        AuditResources.STUDENT,
        'Database error while checking duplicates',
        id,
        { error: checkError.message, endpoint: '/api/admin/students', method: 'PUT' },
        startTime
      );
      
      return NextResponse.json({ error: 'Failed to check existing student records' }, { status: 500 });
    }

    if (existingStudent) {
      let errorMessage = '';
      if (existingStudent.register_number === studentData.register_number) {
        errorMessage = 'Another student with this register number already exists';
      }
      if (existingStudent.email === studentData.email.toLowerCase()) {
        errorMessage = 'Another student with this email address already exists';
      }
      
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.UPDATE,
        AuditResources.STUDENT,
        errorMessage,
        id,
        { studentData, endpoint: '/api/admin/students', method: 'PUT' },
        startTime
      );
      
      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }

    // Update the student record
    const { data: updatedStudent, error: updateError } = await (supabaseAdmin as any)
      .from('unified_students')
      .update({
        register_number: studentData.register_number,
        name: studentData.name.trim(),
        email: studentData.email.toLowerCase().trim(),
        mobile: studentData.mobile?.trim() || null,
        class_year: studentData.class_year,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating student:', updateError);
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.UPDATE,
        AuditResources.STUDENT,
        'Database error while updating student',
        id,
        { error: updateError.message, endpoint: '/api/admin/students', method: 'PUT' },
        startTime
      );
      
      // Use error handler for more detailed error response
      const errorContext = {
        code: updateError.code,
        statusCode: 500,
        endpoint: '/api/admin/students',
        method: 'PUT',
        userAction: 'update_student'
      };
      
      const actionableError = adminErrorHandler.handle(new Error('Failed to update student record'), errorContext);
      return NextResponse.json({ error: actionableError.message }, { status: 500 });
    }

    if (!updatedStudent) {
      const notFoundError = new Error('Student not found');
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.UPDATE,
        AuditResources.STUDENT,
        'Student not found',
        id,
        { endpoint: '/api/admin/students', method: 'PUT' },
        startTime
      );
      
      const errorContext = {
        statusCode: 404,
        endpoint: '/api/admin/students',
        method: 'PUT',
        userAction: 'update_student'
      };
      
      const actionableError = adminErrorHandler.handle(notFoundError, errorContext);
      return NextResponse.json({ error: actionableError.message }, { status: 404 });
    }

    auditLogger.logSuccess(
      userId,
      userRole,
      AuditActions.UPDATE,
      AuditResources.STUDENT,
      id,
      { studentData, endpoint: '/api/admin/students', method: 'PUT' },
      startTime
    );

    return NextResponse.json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent
    });

  } catch (error: any) {
    console.error('Student update error:', error);
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.UPDATE,
      AuditResources.STUDENT,
      error.message || 'Unknown error',
      undefined,
      { error: error.message, endpoint: '/api/admin/students', method: 'PUT' },
      startTime
    );
    
    // Use error handler for more detailed error response
    const errorContext = {
      code: error.code,
      statusCode: 500,
      endpoint: '/api/admin/students',
      method: 'PUT',
      userAction: 'update_student'
    };
    
    const actionableError = adminErrorHandler.handle(error, errorContext);
    return NextResponse.json(
      { error: actionableError.message, details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete student
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const { userId, userRole } = await getAdminUserInfo(request);
  
  if (!(await checkAdminAuth(request))) {
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.DELETE,
      AuditResources.STUDENT,
      'Unauthorized access attempt',
      undefined,
      { endpoint: '/api/admin/students', method: 'DELETE' },
      startTime
    );
    
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.DELETE,
        AuditResources.STUDENT,
        'Student ID is required',
        undefined,
        { endpoint: '/api/admin/students', method: 'DELETE' },
        startTime
      );
      
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Get student info before deletion for audit log
    const { data: studentToDelete, error: fetchError } = await (supabaseAdmin as any)
      .from('unified_students')
      .select('register_number, name, email')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching student for deletion:', fetchError);
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.DELETE,
        AuditResources.STUDENT,
        'Database error while fetching student for deletion',
        id,
        { error: fetchError.message, endpoint: '/api/admin/students', method: 'DELETE' },
        startTime
      );
      
      return NextResponse.json({ error: 'Failed to fetch student record' }, { status: 500 });
    }

    if (!studentToDelete) {
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.DELETE,
        AuditResources.STUDENT,
        'Student not found',
        id,
        { endpoint: '/api/admin/students', method: 'DELETE' },
        startTime
      );
      
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Delete the student record
    const { error: deleteError } = await (supabaseAdmin as any)
      .from('unified_students')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting student:', deleteError);
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.DELETE,
        AuditResources.STUDENT,
        'Database error while deleting student',
        id,
        { error: deleteError.message, endpoint: '/api/admin/students', method: 'DELETE' },
        startTime
      );
      
      // Use error handler for more detailed error response
      const errorContext = {
        code: deleteError.code,
        statusCode: 500,
        endpoint: '/api/admin/students',
        method: 'DELETE',
        userAction: 'delete_student'
      };
      
      const actionableError = adminErrorHandler.handle(new Error('Failed to delete student record'), errorContext);
      return NextResponse.json({ error: actionableError.message }, { status: 500 });
    }

    auditLogger.logSuccess(
      userId,
      userRole,
      AuditActions.DELETE,
      AuditResources.STUDENT,
      id,
      { student: studentToDelete, endpoint: '/api/admin/students', method: 'DELETE' },
      startTime
    );

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully'
    });

  } catch (error: any) {
    console.error('Student deletion error:', error);
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.DELETE,
      AuditResources.STUDENT,
      error.message || 'Unknown error',
      undefined,
      { error: error.message, endpoint: '/api/admin/students', method: 'DELETE' },
      startTime
    );
    
    // Use error handler for more detailed error response
    const errorContext = {
      code: error.code,
      statusCode: 500,
      endpoint: '/api/admin/students',
      method: 'DELETE',
      userAction: 'delete_student'
    };
    
    const actionableError = adminErrorHandler.handle(error, errorContext);
    return NextResponse.json(
      { error: actionableError.message, details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { userId, userRole } = await getAdminUserInfo(request);
  
  if (!(await checkAdminAuth(request))) {
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.READ,
      AuditResources.STUDENT,
      'Unauthorized access attempt',
      undefined,
      { endpoint: '/api/admin/students', method: 'GET' },
      startTime
    );
    
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co') {
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.READ,
        AuditResources.STUDENT,
        'Supabase not configured',
        undefined,
        { endpoint: '/api/admin/students', method: 'GET' },
        startTime
      );
      
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Supabase not configured. Please set up your Supabase environment variables.',
        timestamp: new Date().toISOString()
      });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const classYear = searchParams.get('class') || 'all';
    const verification = searchParams.get('verification') || 'all';
    // Pagination params (defaults)
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limitRaw = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50;
    const limit = Math.min(limitRaw, 200); // hard cap to prevent huge scans
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Check if students table exists
    let studentsExist = false;
    try {
      const { data: tableTest, error: tableCheckError } = await (supabaseAdmin as any)
        .from('unified_students')
        .select('id')
        .limit(1);
      
      studentsExist = !tableCheckError;
    } catch (error) {
      console.log('unified_students table does not exist or is not accessible');
      studentsExist = false;
    }

    if (!studentsExist) {
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.READ,
        AuditResources.STUDENT,
        'Students table not found',
        undefined,
        { endpoint: '/api/admin/students', method: 'GET' },
        startTime
      );
      
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Students table not found. Please create the table first.',
        timestamp: new Date().toISOString()
      });
    }

    // Build query for students with all fields and total count
    let studentsQuery = (supabaseAdmin as any)
      .from('unified_students')
      .select('id, register_number, name, email, mobile, class_year, email_verified, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply class filter
    if (classYear !== 'all') {
      studentsQuery = studentsQuery.eq('class_year', classYear);
    }

    // Apply verification filter
    if (verification === 'verified') {
      studentsQuery = studentsQuery.eq('email_verified', true);
    } else if (verification === 'unverified') {
      studentsQuery = studentsQuery.eq('email_verified', false);
    }

    // Apply search filter
    if (search) {
      studentsQuery = studentsQuery.or(`name.ilike.%${search}%,register_number.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply pagination range
    studentsQuery = studentsQuery.range(from, to);

    const { data: students, error: studentsError, count } = await studentsQuery;

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.READ,
        AuditResources.STUDENT,
        'Database error while fetching students',
        undefined,
        { error: studentsError.message, endpoint: '/api/admin/students', method: 'GET' },
        startTime
      );
      
      // Use error handler for more detailed error response
      const errorContext = {
        code: studentsError.code,
        statusCode: 500,
        endpoint: '/api/admin/students',
        method: 'GET',
        userAction: 'fetch_students'
      };
      
      const actionableError = adminErrorHandler.handle(new Error('Failed to fetch students'), errorContext);
      return NextResponse.json(
        { error: actionableError.message, details: studentsError.message },
        { status: 500 }
      );
    }

    const total = count ?? (students ? students.length : 0);
    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    auditLogger.logSuccess(
      userId,
      userRole,
      AuditActions.READ,
      AuditResources.STUDENT,
      undefined,
      { 
        filters: { search, classYear, verification },
        page,
        limit,
        totalResults: students?.length || 0,
        endpoint: '/api/admin/students',
        method: 'GET'
      },
      startTime
    );

    return NextResponse.json({
      success: true,
      data: students || [],
      count: total,
      page,
      limit,
      totalPages,
      filters: { search, classYear, verification },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Students fetch error:', error);
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.READ,
      AuditResources.STUDENT,
      error.message || 'Unknown error',
      undefined,
      { error: error.message, endpoint: '/api/admin/students', method: 'GET' },
      startTime
    );
    
    // Use error handler for more detailed error response
    const errorContext = {
      code: error.code,
      statusCode: 500,
      endpoint: '/api/admin/students',
      method: 'GET',
      userAction: 'fetch_students'
    };
    
    const actionableError = adminErrorHandler.handle(error, errorContext);
    return NextResponse.json(
      {
        error: actionableError.message,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}