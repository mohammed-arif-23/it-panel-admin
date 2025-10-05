import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cloudinaryStorage } from '@/lib/cloudinaryStorage';
import { verifyJWT } from '@/lib/auth';

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

export async function DELETE(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('id');

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    // Get submission details before deletion for logging
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('assignment_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Delete file from Cloudinary first
    const fileUrl = (submission as any).file_url;
    if (fileUrl && fileUrl.includes('cloudinary')) {
      try {
        console.log('Original Cloudinary URL:', fileUrl);
        
        // Detect resource type from URL path
        // URLs can be: /image/upload/, /video/upload/, or /raw/upload/
        let resourceType: 'image' | 'video' | 'raw' = 'raw'; // default
        if (fileUrl.includes('/image/upload/')) {
          resourceType = 'image';
        } else if (fileUrl.includes('/video/upload/')) {
          resourceType = 'video';
        } else if (fileUrl.includes('/raw/upload/')) {
          resourceType = 'raw';
        }
        
        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/[cloud_name]/[resource_type]/upload/v[version]/[public_id].ext
        const uploadMatch = fileUrl.match(/\/upload\/(.+)/);
        if (uploadMatch && uploadMatch[1]) {
          let publicId = uploadMatch[1];
          // Remove version number if present (e.g., v1234567890/)
          publicId = publicId.replace(/^v\d+\//, '');
          // Decode URL encoding (e.g., %20 -> space)
          publicId = decodeURIComponent(publicId);
          // Remove file extension
          publicId = publicId.replace(/\.[^.]+$/, '');
          
          console.log('Extracted public_id:', publicId);
          console.log('Detected resource_type:', resourceType);
          
          await cloudinaryStorage.deleteFile(publicId, resourceType);
          console.log('Successfully deleted file from Cloudinary');
        } else {
          console.warn('Could not parse Cloudinary URL - unexpected format');
        }
      } catch (cloudinaryError) {
        // Log detailed error but don't fail the whole deletion
        console.error('Error deleting file from Cloudinary:', cloudinaryError);
        console.error('File URL was:', fileUrl);
        console.warn('Continuing with database deletion despite Cloudinary error');
      }
    } else {
      console.log('No Cloudinary URL found or non-Cloudinary storage - skipping file deletion');
    }

    // Delete the submission from database
    const { error: deleteError } = await supabaseAdmin
      .from('assignment_submissions')
      .delete()
      .eq('id', submissionId);

    if (deleteError) {
      console.error('Error deleting submission:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete submission', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Submission deleted successfully',
      deleted_submission: {
        id: (submission as any).id,
        student_id: (submission as any).student_id,
        assignment_id: (submission as any).assignment_id,
        file_name: (submission as any).file_name
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in delete submission:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}