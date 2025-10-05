import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { adminErrorHandler } from '../../../../../lib/adminErrorHandler';
import { auditLogger, AuditActions, AuditResources } from '../../../../../lib/auditLogger';
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

// GET - Fetch student by ID with related data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const { userId, userRole } = await getAdminUserInfo(request);
  
  if (!(await checkAdminAuth(request))) {
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.READ,
      AuditResources.STUDENT,
      'Unauthorized access attempt',
      params.id,
      { endpoint: `/api/admin/students/${params.id}`, method: 'GET' },
      startTime
    );
    
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const studentId = params.id;

    // Fetch student details
    const { data: student, error: studentError } = await (supabaseAdmin as any)
      .from('unified_students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (studentError) {
      console.error('Error fetching student:', studentError);
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.READ,
        AuditResources.STUDENT,
        'Database error while fetching student',
        studentId,
        { error: studentError.message, endpoint: `/api/admin/students/${studentId}`, method: 'GET' },
        startTime
      );
      
      // Use error handler for more detailed error response
      const errorContext = {
        code: studentError.code,
        statusCode: 500,
        endpoint: `/api/admin/students/${studentId}`,
        method: 'GET',
        userAction: 'fetch_student'
      };
      
      const actionableError = adminErrorHandler.handle(new Error('Failed to fetch student'), errorContext);
      return NextResponse.json(
        { error: actionableError.message, details: studentError.message },
        { status: 500 }
      );
    }

    if (!student) {
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.READ,
        AuditResources.STUDENT,
        'Student not found',
        studentId,
        { endpoint: `/api/admin/students/${studentId}`, method: 'GET' },
        startTime
      );
      
      const errorContext = {
        statusCode: 404,
        endpoint: `/api/admin/students/${studentId}`,
        method: 'GET',
        userAction: 'fetch_student'
      };
      
      const actionableError = adminErrorHandler.handle(new Error('Student not found'), errorContext);
      return NextResponse.json({ error: actionableError.message }, { status: 404 });
    }

    auditLogger.logSuccess(
      userId,
      userRole,
      AuditActions.READ,
      AuditResources.STUDENT,
      studentId,
      { endpoint: `/api/admin/students/${studentId}`, method: 'GET' },
      startTime
    );

    return NextResponse.json({
      success: true,
      data: student
    });

  } catch (error: any) {
    console.error('Student fetch error:', error);
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.READ,
      AuditResources.STUDENT,
      error.message || 'Unknown error',
      params.id,
      { error: error.message, endpoint: `/api/admin/students/${params.id}`, method: 'GET' },
      startTime
    );
    
    // Use error handler for more detailed error response
    const errorContext = {
      code: error.code,
      statusCode: 500,
      endpoint: `/api/admin/students/${params.id}`,
      method: 'GET',
      userAction: 'fetch_student'
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