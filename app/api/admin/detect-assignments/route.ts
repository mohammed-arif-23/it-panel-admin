import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cloudinaryStorage } from '@/lib/cloudinaryStorage';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface AssignmentSubmission {
  id: string;
  student_id: string;
  assignment_id: string;
  file_url: string;
  file_name: string;
  submitted_at: string;
  status: string;
  student_name: string;
  register_number: string;
  assignment_title: string;
  file_size: number;
  file_hash?: string;
  similarity_score?: number;
  matched_submissions?: string[];
}

interface DatabaseSubmission {
  id: string;
  student_id: string;
  assignment_id: string;
  file_url: string;
  file_name: string;
  submitted_at: string;
  status: string;
  file_size?: number;
  file_hash?: string;
  unified_students?: {
    name: string;
    register_number: string;
    class_year: string;
  };
  assignments?: {
    title: string;
    class_year: string;
  };
}

// Helper function to calculate file hash
async function calculateFileHash(fileUrl: string): Promise<string> {
  try {
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(buffer));
    return hash.digest('hex');
  } catch (error) {
    console.error('Error calculating file hash:', error);
    return '';
  }
}

// Function to fetch file content from Cloudinary
async function fetchFileContent(fileUrl: string): Promise<Buffer | null> {
  try {
    console.log('Fetching file content from:', fileUrl);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      console.error('Failed to fetch file:', response.status, response.statusText);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error fetching file content:', error);
    return null;
  }
}




export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // First, let's check if there are any submissions at all
    const { data: allSubmissions, error: allError } = await supabaseAdmin
      .from('assignment_submissions')
      .select('id, status')
      .limit(5);
    
    console.log('Total submissions in database:', { count: allSubmissions?.length, error: allError });
    
    const assignment = searchParams.get('assignment');
    const class_year = searchParams.get('class_year');
    const date_range = searchParams.get('date_range');
    
    // Build query
    let query = supabaseAdmin
      .from('assignment_submissions')
      .select(`
        *,
        unified_students!assignment_submissions_student_id_fkey (
          name,
          register_number,
          class_year
        ),
        assignments!assignment_submissions_assignment_id_fkey (
          title,
          class_year
        )
      `)
      .eq('status', 'submitted');
    
    if (assignment) {
      query = query.eq('assignment_id', assignment);
    }
    
    if (class_year) {
      query = query.eq('unified_students.class_year', class_year);
    }
    
    if (date_range) {
      const [start, end] = date_range.split(' to ');
      if (start) query = query.gte('submitted_at', start);
      if (end) query = query.lte('submitted_at', end);
    }
    
    const { data: submissions, error } = await query;
    
    console.log('GET Query result:', { submissions: submissions?.length, error });
    
    if (error) {
      console.error('GET Query error:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch submissions: ' + error.message
      }, { status: 500 });
    }
    
    // Transform data
    const transformedSubmissions = (submissions as DatabaseSubmission[])?.map(submission => ({
      id: submission.id,
      student_id: submission.student_id,
      assignment_id: submission.assignment_id,
      file_url: submission.file_url,
      file_name: submission.file_name,
      submitted_at: submission.submitted_at,
      status: submission.status,
      student_name: submission.unified_students?.name || 'Unknown',
      register_number: submission.unified_students?.register_number || 'Unknown',
      assignment_title: submission.assignments?.title || 'Unknown',
      file_size: submission.file_size || 0
    })) || [];
    
    return NextResponse.json({
      success: true,
      data: transformedSubmissions
    });
    
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { assignment_id, method, min_similarity = 80 } = body;
    
    console.log('Detection request:', { assignment_id, method, min_similarity });
    
    // First, let's check what assignments exist
    const { data: allAssignments, error: assignmentsError } = await supabaseAdmin
      .from('assignments')
      .select('id, title, class_year')
      .limit(10);
    
    console.log('All assignments:', { count: allAssignments?.length, error: assignmentsError });
    
    // Check if the specific assignment exists
    if (assignment_id) {
      const { data: specificAssignment, error: specificError } = await supabaseAdmin
        .from('assignments')
        .select('id, title, class_year')
        .eq('id', assignment_id)
        .single();
      
      console.log('Specific assignment:', { assignment: specificAssignment, error: specificError });
    }
    
    // Check all submissions for this assignment
    if (assignment_id) {
      const { data: allSubmissionsForAssignment, error: allSubsError } = await supabaseAdmin
        .from('assignment_submissions')
        .select('id, status, student_id, assignment_id')
        .eq('assignment_id', assignment_id);
      
      console.log('All submissions for assignment:', { count: allSubmissionsForAssignment?.length, error: allSubsError });
    }
    
    // Check what status values exist in submissions
    const { data: statusCounts, error: statusError } = await supabaseAdmin
      .from('assignment_submissions')
      .select('status')
      .not('status', 'is', null);
    
    const statusGroups = statusCounts?.reduce((acc: any, sub: any) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Status distribution:', statusGroups);
    
    // Fetch submissions for the assignment
    let query = supabaseAdmin
      .from('assignment_submissions')
      .select(`
        *,
        unified_students!assignment_submissions_student_id_fkey (
          name,
          register_number,
          class_year
        ),
        assignments!assignment_submissions_assignment_id_fkey (
          title,
          class_year
        )
      `)
      .not('status', 'is', null); // Get all submissions with any status
    
    if (assignment_id) {
      console.log('Filtering by assignment_id:', assignment_id);
      query = query.eq('assignment_id', assignment_id);
    }
    
    const { data: submissions, error } = await query;
    
    console.log('POST Query result:', { submissions: submissions?.length, error });
    
    if (error) {
      console.error('POST Query error:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch submissions: ' + error.message
      }, { status: 500 });
    }
    
    if (!submissions || submissions.length === 0) {
      console.log('No submissions found for detection');
      return NextResponse.json({
        success: true,
        results: [],
        message: 'No submissions found for the selected criteria'
      });
    }
    
    console.log(`Found ${submissions.length} submissions for detection`);
    
    // Transform data
    const transformedSubmissions = (submissions as DatabaseSubmission[]).map(submission => ({
      id: submission.id,
      student_id: submission.student_id,
      assignment_id: submission.assignment_id,
      file_url: submission.file_url,
      file_name: submission.file_name,
      submitted_at: submission.submitted_at,
      status: submission.status,
      student_name: submission.unified_students?.name || 'Unknown',
      register_number: submission.unified_students?.register_number || 'Unknown',
      assignment_title: submission.assignments?.title || 'Unknown',
      file_size: submission.file_size || 0,
      file_hash: submission.file_hash
    }));
    
    console.log('Transformed submissions:', transformedSubmissions.length);
    console.log('Sample submission URLs:', transformedSubmissions.slice(0, 3).map(s => s.file_url));
    
    const results: any[] = [];
    
    // File Hash Comparison (only detection method)
    console.log('Starting file hash comparison for', transformedSubmissions.length, 'submissions');
    const hashGroups = new Map<string, any[]>();

      const allHaveStoredHash = transformedSubmissions.every(s => !!s.file_hash);
      console.log('All submissions have stored hash?', allHaveStoredHash);

      if (allHaveStoredHash) {
        // Use stored hashes directly; no file fetching
        for (const submission of transformedSubmissions) {
          const fileHash = submission.file_hash!;
          if (!hashGroups.has(fileHash)) {
            hashGroups.set(fileHash, []);
          }
          hashGroups.get(fileHash)!.push(submission);
        }
      } else {
        // Fallback: compute hashes for those missing (minimize file checks)
        for (const submission of transformedSubmissions) {
          const fileHash = submission.file_hash || (await calculateFileHash(submission.file_url));
          if (fileHash) {
            if (!hashGroups.has(fileHash)) {
              hashGroups.set(fileHash, []);
            }
            hashGroups.get(fileHash)!.push({
              ...submission,
              file_hash: fileHash
            });
          }
        }
      }

      console.log('Hash groups created:', hashGroups.size);

      const suspiciousGroups = Array.from(hashGroups.entries())
        .filter(([hash, group]) => group.length > 1)
        .map(([hash, group]) => ({
          group_id: `hash_${hash.substring(0, 8)}`,
          submissions: group,
          confidence: 100,
          reason: `Identical file hash (${group.length} students)`
        }));

    console.log('Suspicious hash groups found:', suspiciousGroups.length);
    if (suspiciousGroups.length > 0) {
      results.push({
        method: 'File Hash Comparison',
        description: 'Detects identical files by comparing cryptographic hashes',
        suspicious_groups: suspiciousGroups
      });
    }
    
    console.log(`Detection completed. Found ${results.length} result groups`);
    
    return NextResponse.json({
      success: true,
      results: results,
      total_submissions: transformedSubmissions.length,
      total_groups: results.reduce((acc, result) => acc + result.suspicious_groups.length, 0)
    });
    
  } catch (error) {
    console.error('Error running detection:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
