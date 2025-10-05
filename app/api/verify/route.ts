import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { emailService } from '../../../lib/emailService';
import { Student } from '../../../types/database';

// Store OTPs in memory (in production, you might want to use Redis or database)
const otpStore = new Map<string, { otp: string; expiresAt: Date; password: string }>();

// Generate a random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { action, registerNumber, otp, password, confirmPassword } = await request.json();

    if (action === 'generate') {
      // Generate and send OTP
      if (!registerNumber) {
        return NextResponse.json(
          { error: 'Register number is required' },
          { status: 400 }
        );
      }

      // Check if student exists
      const { data: student, error: studentError } = await supabaseAdmin
        .from('unified_students')
        .select('id, register_number, email, name, password')
        .eq('register_number', registerNumber)
        .single();

      if (studentError || !student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }

      // Fixing TypeScript error: properly type the student object
      const typedStudent = student as Student;

      if (!typedStudent.email) {
        return NextResponse.json(
          { error: 'No email found for this student. Please contact admin.' },
          { status: 400 }
        );
      }

      // Generate OTP
      const generatedOTP = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      // Store OTP with temporary password
      otpStore.set(registerNumber, {
        otp: generatedOTP,
        expiresAt,
        password: '' // Will be set during verification
      });

      // Send OTP via email
      const emailResult = await emailService.sendEmail({
        to: typedStudent.email,
        subject: 'Password Verification OTP',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Password Verification</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Password Verification</h2>
              <p>Hello ${typedStudent.name || typedStudent.register_number},</p>
              <p>Your OTP for password verification is:</p>
              <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px;">
                ${generatedOTP}
              </div>
              <p>This OTP is valid for 10 minutes.</p>
              <p>If you didn't request this, please ignore this email.</p>
              <hr style="margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">
                This is an automated message from the Department of IT.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `Your OTP for password verification is: ${generatedOTP}. This OTP is valid for 10 minutes.`
      });

      if (!emailResult.success) {
        console.error('Failed to send OTP email:', emailResult.error);
        return NextResponse.json(
          { error: 'Failed to send OTP email. Please try again.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'OTP sent to your registered email'
      });

    } else if (action === 'verify') {
      // Verify OTP and set password
      if (!registerNumber || !otp || !password || !confirmPassword) {
        return NextResponse.json(
          { error: 'All fields are required' },
          { status: 400 }
        );
      }

      if (password !== confirmPassword) {
        return NextResponse.json(
          { error: 'Passwords do not match' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      // Check if OTP exists and is valid
      const otpData = otpStore.get(registerNumber);
      if (!otpData) {
        return NextResponse.json(
          { error: 'OTP not found or expired. Please generate a new OTP.' },
          { status: 400 }
        );
      }

      if (new Date() > otpData.expiresAt) {
        otpStore.delete(registerNumber); // Clean up expired OTP
        return NextResponse.json(
          { error: 'OTP has expired. Please generate a new OTP.' },
          { status: 400 }
        );
      }

      if (otpData.otp !== otp) {
        return NextResponse.json(
          { error: 'Invalid OTP' },
          { status: 400 }
        );
      }

      // Store the password directly without hashing
      const { error: updateError } = await (supabaseAdmin as any)
        .from('unified_students')
        .update({
          password: password, // Store password directly as requested
          updated_at: new Date().toISOString()
        })
        .eq('register_number', registerNumber);

      if (updateError) {
        console.error('Failed to update password:', updateError);
        return NextResponse.json(
          { error: 'Failed to set password. Please try again.' },
          { status: 500 }
        );
      }

      // Clean up OTP store
      otpStore.delete(registerNumber);

      return NextResponse.json({
        success: true,
        message: 'Password set successfully'
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}