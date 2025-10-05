import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateFileHash } from '@/lib/hashUtils'

export const maxDuration = 300 // 5 minutes for batch processing
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface SubmissionWithoutHash {
  id: string
  file_url: string
  file_name: string
  student_id: string
  assignment_id: string
  submitted_at: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assignment_id, batch_size = 10 } = body
    
    console.log('Starting hash generation for assignment:', assignment_id)
    
    // Get all submissions without hashes for the specified assignment
    let query = supabaseAdmin
      .from('assignment_submissions')
      .select(`
        id,
        file_url,
        file_name,
        student_id,
        assignment_id,
        submitted_at
      `)
      .is('file_hash', null)
    
    if (assignment_id) {
      query = query.eq('assignment_id', assignment_id)
    }
    
    const { data: submissions, error } = await query as any
    
    if (error) {
      console.error('Error fetching submissions:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch submissions: ' + error.message 
      }, { status: 500 })
    }
    
    if (!submissions || submissions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No submissions found without hashes',
        processed: 0,
        total: 0
      })
    }
    
    console.log(`Found ${submissions.length} submissions to process`)
    
    let processed = 0
    let errors = 0
    const results = []
    
    // Process submissions in batches to avoid overwhelming the system
    for (let i = 0; i < submissions.length; i += batch_size) {
      const batch = submissions.slice(i, i + batch_size)
      
      console.log(`Processing batch ${Math.floor(i / batch_size) + 1}/${Math.ceil(submissions.length / batch_size)}`)
      
      // Process batch concurrently
      const batchPromises = batch.map(async (submission: SubmissionWithoutHash) => {
        try {
          console.log(`Calculating hash for submission ${submission.id}: ${submission.file_name}`)
          
          // Calculate hash for the file
          const fileHash = await calculateFileHash(submission.file_url)
          
          // Update the submission with the hash
          const { error: updateError } = await (supabaseAdmin as any)
            .from('assignment_submissions')
            .update({ 
              file_hash: fileHash,
              hash_generated_at: new Date().toISOString()
            } as any)
            .eq('id', submission.id)
          
          if (updateError) {
            console.error(`Error updating submission ${submission.id}:`, updateError)
            return { 
              id: submission.id, 
              success: false, 
              error: updateError.message 
            }
          }
          
          console.log(`Successfully generated hash for submission ${submission.id}`)
          return { 
            id: submission.id, 
            success: true, 
            hash: fileHash.substring(0, 8) + '...' 
          }
          
        } catch (error) {
          console.error(`Error processing submission ${submission.id}:`, error)
          return { 
            id: submission.id, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      })
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Count successes and errors
      const batchProcessed = batchResults.filter(r => r.success).length
      const batchErrors = batchResults.filter(r => !r.success).length
      
      processed += batchProcessed
      errors += batchErrors
      
      console.log(`Batch completed: ${batchProcessed} successful, ${batchErrors} errors`)
      
      // Add a small delay between batches to avoid overwhelming the system
      if (i + batch_size < submissions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    console.log(`Hash generation completed: ${processed} successful, ${errors} errors`)
    
    return NextResponse.json({
      success: true,
      message: `Hash generation completed for ${submissions.length} submissions`,
      processed,
      errors,
      total: submissions.length,
      results: results.slice(0, 10) // Return first 10 results for debugging
    })
    
  } catch (error) {
    console.error('Error in hash generation:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assignment_id = searchParams.get('assignment_id')
    
    // Get statistics about hash generation status
    let query = supabaseAdmin
      .from('assignment_submissions')
      .select('id, file_hash, hash_generated_at')
    
    if (assignment_id) {
      query = query.eq('assignment_id', assignment_id)
    }
    
    const { data: submissions, error } = await query
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch hash status: ' + error.message 
      }, { status: 500 })
    }
    
    const total = (submissions as any[])?.length || 0
    const withHash = (submissions as any[])?.filter((s: any) => s.file_hash).length || 0
    const withoutHash = total - withHash
    
    return NextResponse.json({
      success: true,
      statistics: {
        total_submissions: total,
        with_hash: withHash,
        without_hash: withoutHash,
        completion_percentage: total > 0 ? Math.round((withHash / total) * 100) : 0
      }
    })
    
  } catch (error) {
    console.error('Error fetching hash status:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
