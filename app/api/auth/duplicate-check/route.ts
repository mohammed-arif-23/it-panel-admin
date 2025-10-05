import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registerNumber, email, mobile, name } = body;

    if (!registerNumber) {
      return NextResponse.json(
        { error: 'Register number is required' },
        { status: 400 }
      );
    }

    const detections = [];
    let duplicateCount = 0;

    // Check exact register number match
    const { data: existingByRegNo, error: regNoError } = await (supabase as any)
      .from('unified_students')
      .select('id, register_number, name, email, mobile')
      .eq('register_number', registerNumber)
      .single();

    if (existingByRegNo && !regNoError) {
      detections.push({
        type: 'register_number_exists',
        existingStudentId: (existingByRegNo as any).id,
        message: 'Register number already exists',
        severity: 'high',
        existingData: {
          registerNumber: (existingByRegNo as any).register_number,
          name: (existingByRegNo as any).name,
          email: (existingByRegNo as any).email
        }
      });
      duplicateCount++;
    }

    // Check email match (if provided)
    if (email) {
      const { data: existingByEmail, error: emailError } = await (supabase as any)
        .from('unified_students')
        .select('id, register_number, name, email, mobile')
        .eq('email', email)
        .neq('register_number', registerNumber) // Exclude the same register number
        .single();

      if (existingByEmail && !emailError) {
        detections.push({
          type: 'email_exists',
          existingStudentId: (existingByEmail as any).id,
          message: 'Email already registered with another account',
          severity: 'high',
          existingData: {
            registerNumber: (existingByEmail as any).register_number,
            name: (existingByEmail as any).name,
            email: (existingByEmail as any).email
          }
        });
        duplicateCount++;
      }
    }

    // Check mobile match (if provided)
    if (mobile) {
      const { data: existingByMobile, error: mobileError } = await (supabase as any)
        .from('unified_students')
        .select('id, register_number, name, email, mobile')
        .eq('mobile', mobile)
        .neq('register_number', registerNumber) // Exclude the same register number
        .single();

      if (existingByMobile && !mobileError) {
        detections.push({
          type: 'mobile_exists',
          existingStudentId: (existingByMobile as any).id,
          message: 'Mobile number already registered with another account',
          severity: 'medium',
          existingData: {
            registerNumber: (existingByMobile as any).register_number,
            name: (existingByMobile as any).name,
            mobile: (existingByMobile as any).mobile
          }
        });
        duplicateCount++;
      }
    }

    // Check for similar names (basic similarity check)
    if (name && name.trim().length > 0) {
      const { data: allStudents, error: studentsError } = await (supabase as any)
        .from('unified_students')
        .select('id, register_number, name, email')
        .neq('register_number', registerNumber);

      if (!studentsError && allStudents) {
        for (const student of allStudents) {
          if ((student as any).name) {
            const similarity = calculateStringSimilarity(
              name.toLowerCase().trim(),
              (student as any).name.toLowerCase().trim()
            );

            if (similarity > 0.8) { // 80% similarity threshold
              detections.push({
                type: 'similar_name',
                existingStudentId: (student as any).id,
                message: `Similar name found: "${(student as any).name}"`,
                severity: 'low',
                similarityScore: similarity,
                existingData: {
                  registerNumber: (student as any).register_number,
                  name: (student as any).name,
                  email: (student as any).email
                }
              });
            }
          }
        }
      }
    }

    // Determine recommendation
    let recommendation = 'allow_registration';
    if (duplicateCount > 0) {
      const hasHighSeverity = detections.some(d => d.severity === 'high');
      recommendation = hasHighSeverity ? 'block_registration' : 'manual_review';
    }

    // Log duplicate detection if any found
    if (duplicateCount > 0) {
      await logDuplicateDetection({
        registerNumber,
        email,
        mobile,
        name,
        detections,
        recommendation,
        ipAddress: (request as any).ip,
        userAgent: request.headers.get('user-agent') || undefined
      });
    }

    return NextResponse.json({
      hasDuplicates: duplicateCount > 0,
      duplicateCount,
      detections,
      recommendation,
      message: duplicateCount > 0 
        ? `Found ${duplicateCount} potential duplicate(s)` 
        : 'No duplicates detected'
    });

  } catch (error) {
    console.error('Duplicate detection error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate string similarity
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const levenshteinDistance = getLevenshteinDistance(longer, shorter);
  return (longer.length - levenshteinDistance) / longer.length;
}

// Levenshtein distance algorithm
function getLevenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Helper function to log duplicate detection
async function logDuplicateDetection(data: {
  registerNumber: string;
  email?: string;
  mobile?: string;
  name?: string;
  detections: any[];
  recommendation: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await (supabase as any)
      .from('unified_duplicate_detection_logs')
      .insert({
        register_number: data.registerNumber,
        email: data.email,
        mobile: data.mobile,
        detection_type: 'multiple_accounts',
        attempted_registration_data: {
          registerNumber: data.registerNumber,
          email: data.email,
          mobile: data.mobile,
          name: data.name,
          detections: data.detections
        },
        action_taken: data.recommendation === 'block_registration' ? 'blocked' : 'flagged',
        ip_address: data.ipAddress,
        user_agent: data.userAgent
      });
  } catch (error) {
    console.error('Failed to log duplicate detection:', error);
  }
}