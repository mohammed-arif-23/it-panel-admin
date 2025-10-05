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

// Validate student data from CSV/Excel
function validateStudentRow(row: any, rowIndex: number): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate register number
  if (!row.register_number || String(row.register_number).length !== 12) {
    errors.push('Register number must be exactly 12 digits');
  } else if (!/^\d{12}$/.test(String(row.register_number))) {
    errors.push('Register number must contain only digits');
  }
  
  // Validate name
  if (!row.name || !String(row.name).trim()) {
    errors.push('Name is required');
  }
  
  // Validate email
  if (!row.email || !String(row.email).trim()) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.email))) {
    errors.push('Please enter a valid email address');
  }
  
  // Validate class year
  const validClassYears = ['II-IT', 'III-IT'];
  if (!row.class_year || !validClassYears.includes(String(row.class_year))) {
    errors.push('Invalid class year. Must be II-IT or III-IT');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// POST - Bulk import students from CSV data
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { userId, userRole } = await getAdminUserInfo(request);
  
  if (!(await checkAdminAuth(request))) {
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.IMPORT,
      AuditResources.STUDENT,
      'Unauthorized access attempt',
      undefined,
      { endpoint: '/api/admin/students/bulk-import', method: 'POST' },
      startTime
    );
    
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { students } = body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.IMPORT,
        AuditResources.STUDENT,
        'No student data provided',
        undefined,
        { endpoint: '/api/admin/students/bulk-import', method: 'POST' },
        startTime
      );
      
      return NextResponse.json({ error: 'No student data provided' }, { status: 400 });
    }

    // Validate all rows first
    const validationResults = students.map((student, index) => ({
      ...validateStudentRow(student, index + 1),
      rowIndex: index + 1,
      student
    }));

    const invalidRows = validationResults.filter(result => !result.isValid);
    if (invalidRows.length > 0) {
      const errorDetails = invalidRows.map(result => 
        `Row ${result.rowIndex}: ${result.errors.join(', ')}`
      ).join('; ');
      
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.IMPORT,
        AuditResources.STUDENT,
        `Validation failed for ${invalidRows.length} rows`,
        undefined,
        { 
          errorDetails, 
          invalidRowCount: invalidRows.length,
          endpoint: '/api/admin/students/bulk-import', 
          method: 'POST' 
        },
        startTime
      );
      
      return NextResponse.json({ 
        error: `Validation failed for ${invalidRows.length} rows`,
        details: errorDetails
      }, { status: 400 });
    }

    // Check for duplicates in the import data itself
    const registerNumbers = students.map(s => String(s.register_number));
    const emails = students.map(s => String(s.email).toLowerCase());
    
    const duplicateRegisterNumbers = registerNumbers.filter((num, index) => 
      registerNumbers.indexOf(num) !== index
    );
    
    const duplicateEmails = emails.filter((email, index) => 
      emails.indexOf(email) !== index
    );
    
    if (duplicateRegisterNumbers.length > 0 || duplicateEmails.length > 0) {
      const duplicates = [
        ...duplicateRegisterNumbers.map(num => `Register number ${num}`),
        ...duplicateEmails.map(email => `Email ${email}`)
      ].join(', ');
      
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.IMPORT,
        AuditResources.STUDENT,
        'Duplicate entries found in import data',
        undefined,
        { 
          duplicates, 
          endpoint: '/api/admin/students/bulk-import', 
          method: 'POST' 
        },
        startTime
      );
      
      return NextResponse.json({ 
        error: 'Duplicate entries found in import data',
        details: duplicates
      }, { status: 400 });
    }

    // Check for existing students in database
    const { data: existingStudents, error: checkError } = await (supabaseAdmin as any)
      .from('unified_students')
      .select('id, register_number, email')
      .or(`register_number.in.(${registerNumbers.join(',')}),email.in.(${emails.join(',')})`);

    if (checkError) {
      console.error('Error checking existing students:', checkError);
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.IMPORT,
        AuditResources.STUDENT,
        'Database error while checking existing students',
        undefined,
        { 
          error: checkError.message, 
          endpoint: '/api/admin/students/bulk-import', 
          method: 'POST' 
        },
        startTime
      );
      
      return NextResponse.json({ error: 'Failed to check existing student records' }, { status: 500 });
    }

    if (existingStudents && existingStudents.length > 0) {
      const conflicts = existingStudents.map((student: any) => 
        `Register number ${student.register_number} or email ${student.email} already exists`
      ).join(', ');
      
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.IMPORT,
        AuditResources.STUDENT,
        'Conflicting student records found',
        undefined,
        { 
          conflicts, 
          conflictCount: existingStudents.length,
          endpoint: '/api/admin/students/bulk-import', 
          method: 'POST' 
        },
        startTime
      );
      
      return NextResponse.json({ 
        error: 'Conflicting student records found',
        details: conflicts,
        conflictCount: existingStudents.length
      }, { status: 409 });
    }

    // Prepare student data for insertion
    const studentsToInsert = students.map(student => ({
      register_number: String(student.register_number),
      name: String(student.name).trim(),
      email: String(student.email).toLowerCase().trim(),
      mobile: student.mobile ? String(student.mobile).trim() : null,
      class_year: String(student.class_year),
      email_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert students
    const { data: insertedStudents, error: insertError } = await (supabaseAdmin as any)
      .from('unified_students')
      .insert(studentsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting students:', insertError);
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.IMPORT,
        AuditResources.STUDENT,
        'Database error while inserting students',
        undefined,
        { 
          error: insertError.message, 
          studentCount: students.length,
          endpoint: '/api/admin/students/bulk-import', 
          method: 'POST' 
        },
        startTime
      );
      
      // Use error handler for more detailed error response
      const errorContext = {
        code: insertError.code,
        statusCode: 500,
        endpoint: '/api/admin/students/bulk-import',
        method: 'POST',
        userAction: 'bulk_import_students'
      };
      
      const actionableError = adminErrorHandler.handle(new Error('Failed to import students'), errorContext);
      return NextResponse.json({ error: actionableError.message }, { status: 500 });
    }

    auditLogger.logSuccess(
      userId,
      userRole,
      AuditActions.IMPORT,
      AuditResources.STUDENT,
      undefined,
      { 
        importedCount: insertedStudents?.length || 0,
        studentCount: students.length,
        endpoint: '/api/admin/students/bulk-import', 
        method: 'POST' 
      },
      startTime
    );

    return NextResponse.json({
      success: true,
      importedCount: insertedStudents?.length || 0,
      message: `${insertedStudents?.length || 0} students imported successfully`
    });

  } catch (error: any) {
    console.error('Bulk import error:', error);
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.IMPORT,
      AuditResources.STUDENT,
      error.message || 'Unknown error',
      undefined,
      { 
        error: error.message, 
        endpoint: '/api/admin/students/bulk-import', 
        method: 'POST' 
      },
      startTime
    );
    
    // Use error handler for more detailed error response
    const errorContext = {
      code: error.code,
      statusCode: 500,
      endpoint: '/api/admin/students/bulk-import',
      method: 'POST',
      userAction: 'bulk_import_students'
    };
    
    const actionableError = adminErrorHandler.handle(error, errorContext);
    return NextResponse.json(
      { error: actionableError.message, details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}