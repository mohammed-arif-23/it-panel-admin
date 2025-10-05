import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      registerNumber, 
      name, 
      email, 
      mobile, 
      classYear,
      browserFingerprint,
      deviceInfo 
    } = body;

    // Validate required fields
    if (!registerNumber || !name || !email) {
      return NextResponse.json(
        { error: 'Register number, name, and email are required' },
        { status: 400 }
      );
    }

    // Final duplicate check before registration
    const duplicateCheckResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/duplicate-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registerNumber,
        email,
        mobile,
        name
      })
    });

    const duplicateResult = await duplicateCheckResponse.json();
    
    if (duplicateResult.hasDuplicates && duplicateResult.recommendation === 'block_registration') {
      // Log blocked registration attempt
      await (supabase as any)
        .from('unified_blocked_registrations')
        .insert({
          register_number: registerNumber,
          email: email,
          mobile: mobile,
          block_type: 'duplicate_detection',
          block_reason: `Duplicate registration detected: ${duplicateResult.detections.map((d: any) => d.message).join(', ')}`,
          ip_address: (request as any).ip
        });

      return NextResponse.json({
        error: 'Registration blocked due to duplicate detection',
        duplicates: duplicateResult.detections,
        message: 'This information appears to be already registered. Please contact administration if this is an error.'
      }, { status: 409 });
    }

    // Create the student record
    const studentData = {
      register_number: registerNumber,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile?.trim(),
      class_year: classYear?.trim(),
      email_verified: false, // No email verification required
      email_verified_at: null,
      registration_method: 'direct',
      created_at: new Date().toISOString()
    };

    const { data: newStudent, error: studentError } = await (supabase as any)
      .from('unified_students')
      .insert(studentData)
      .select('*')
      .single();

    if (studentError) {
      console.error('Student creation error:', studentError);
      
      // Check if it's a duplicate key error
      if (studentError.code === '23505') { // PostgreSQL unique violation
        const field = studentError.message.includes('register_number') ? 'register number' :
                     studentError.message.includes('email') ? 'email' : 'information';
        
        return NextResponse.json(
          { error: `This ${field} is already registered. Please use different information or contact support.` },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create student record' },
        { status: 500 }
      );
    }

    // Log successful registration attempt
    await (supabase as any)
      .from('unified_registration_attempts')
      .insert({
        register_number: registerNumber,
        email: email,
        mobile: mobile,
        name: name,
        class_year: classYear,
        attempt_status: 'completed',
        otp_verification_id: null, // No OTP verification used
        final_student_id: (newStudent as any).id,
        ip_address: (request as any).ip,
        user_agent: request.headers.get('user-agent'),
        browser_fingerprint: browserFingerprint,
        device_info: deviceInfo,
        completed_at: new Date().toISOString()
      });

    // Create email change history record (without OTP)
    await (supabase as any)
      .from('unified_email_change_history')
      .insert({
        student_id: (newStudent as any).id,
        new_email: email,
        change_reason: 'initial_registration',
        verification_method: 'direct',
        otp_verification_id: null,
        ip_address: (request as any).ip,
        user_agent: request.headers.get('user-agent')
      });

    return NextResponse.json({
      success: true,
      message: 'Registration completed successfully',
      student: {
        id: (newStudent as any).id,
        registerNumber: (newStudent as any).register_number,
        name: (newStudent as any).name,
        email: (newStudent as any).email,
        mobile: (newStudent as any).mobile,
        classYear: (newStudent as any).class_year,
        emailVerified: (newStudent as any).email_verified,
        createdAt: (newStudent as any).created_at
      }
    });

  } catch (error) {
    console.error('Registration completion error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}