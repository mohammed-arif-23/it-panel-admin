import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
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

// Validate register number format
function validateRegisterNumber(regNum: string): { isValid: boolean; error?: string } {
  if (!regNum || regNum.length !== 12) {
    return { isValid: false, error: 'Register number must be exactly 12 digits' };
  }
  
  if (!/^\d{12}$/.test(regNum)) {
    return { isValid: false, error: 'Register number must contain only digits' };
  }
  
  // Admin panel - no department validation required
  return { isValid: true };
}

// Validate email format
function validateEmail(email: string): { isValid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true };
}

// Validate mobile number
function validateMobile(mobile: string): { isValid: boolean; error?: string } {
  if (mobile && !/^\d{10}$/.test(mobile)) {
    return { isValid: false, error: 'Mobile number must be 10 digits' };
  }
  return { isValid: true };
}

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { registerNumber, name, email, mobile, classYear } = body;

    // Validate required fields
    if (!registerNumber || !name || !email || !classYear) {
      return NextResponse.json(
        { error: 'Register number, name, email, and class year are required' },
        { status: 400 }
      );
    }

    // Validate register number
    const regValidation = validateRegisterNumber(registerNumber);
    if (!regValidation.isValid) {
      return NextResponse.json(
        { error: 'Register number must be exactly 12 digits' },
        { status: 400 }
      );
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    // Validate mobile if provided
    if (mobile) {
      const mobileValidation = validateMobile(mobile);
      if (!mobileValidation.isValid) {
        return NextResponse.json(
          { error: mobileValidation.error },
          { status: 400 }
        );
      }
    }

    // Validate class year
    const validClassYears = ['II-IT', 'III-IT', 'IV-IT'];
    if (!validClassYears.includes(classYear)) {
      return NextResponse.json(
        { error: 'Invalid class year. Must be II-IT, III-IT, or IV-IT' },
        { status: 400 }
      );
    }

    // Check if student already exists
    const { data: existingStudent, error: checkError } = await supabase
      .from('unified_students')
      .select('id, register_number, email')
      .or(`register_number.eq.${registerNumber},email.eq.${email.toLowerCase()}`)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing student:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing student records' },
        { status: 500 }
      );
    }

    if (existingStudent) {
      if ((existingStudent as any).register_number === registerNumber) {
        return NextResponse.json(
          { error: 'A student with this register number already exists' },
          { status: 409 }
        );
      }
      if ((existingStudent as any).email === email.toLowerCase()) {
        return NextResponse.json(
          { error: 'A student with this email address already exists' },
          { status: 409 }
        );
      }
    }

    // Create the student record
    const { data: newStudent, error: insertError } = await supabase
      .from('unified_students')
      .insert({
        register_number: registerNumber,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        mobile: mobile?.trim() || null,
        class_year: classYear,
        email_verified: false, // Admin registered students start as unverified
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating student:', insertError);
      return NextResponse.json(
        { error: 'Failed to create student record' },
        { status: 500 }
      );
    }

    // Registration is complete with just the unified_students record
    // No need for separate registration table for admin-created students

    // Activity logging removed - unified_student_activity_logs table doesn't exist
    // Student creation in unified_students table is sufficient for admin registration

    return NextResponse.json({
      success: true,
      message: 'Student registered successfully',
      data: {
        id: (newStudent as any).id,
        register_number: (newStudent as any).register_number,
        name: (newStudent as any).name,
        email: (newStudent as any).email,
        class_year: (newStudent as any).class_year,
        mobile: (newStudent as any).mobile
      }
    });

  } catch (error) {
    console.error('Student registration error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}