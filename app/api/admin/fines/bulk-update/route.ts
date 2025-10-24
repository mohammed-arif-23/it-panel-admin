import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWT } from '@/lib/auth';

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

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

// POST - Bulk update fines payment status
export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fineIds, paymentStatus } = body;

    // Validate required fields
    if (!fineIds || !Array.isArray(fineIds) || fineIds.length === 0) {
      return NextResponse.json(
        { error: 'Fine IDs array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!paymentStatus) {
      return NextResponse.json(
        { error: 'Payment status is required' },
        { status: 400 }
      );
    }

    // Validate payment status
    const validStatuses = ['paid', 'pending', 'waived'];
    if (!validStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        { error: 'Invalid payment status. Must be one of: paid, pending, waived' },
        { status: 400 }
      );
    }

    // Update fines
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    };

    // If marking as paid, set paid_amount to base_amount
    if (paymentStatus === 'paid') {
      // First fetch the fines to get their base amounts
      const { data: fines, error: fetchError } = await supabase
        .from('unified_student_fines')
        .select('id, base_amount')
        .in('id', fineIds);

      if (fetchError) {
        console.error('Error fetching fines:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch fines' },
          { status: 500 }
        );
      }

      // Update each fine individually to set paid_amount = base_amount
      const updatePromises = (fines || []).map((fine: any) =>
        supabase
          .from('unified_student_fines')
          .update({
            payment_status: 'paid',
            paid_amount: fine.base_amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', fine.id)
      );

      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Error updating fines:', errors);
        return NextResponse.json(
          { error: 'Failed to update some fines' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Successfully updated ${fineIds.length} fine(s)`,
        updated_count: fineIds.length
      });
    } else {
      // For other statuses, just update the payment_status
      const { data, error: updateError } = await supabase
        .from('unified_student_fines')
        .update(updateData)
        .in('id', fineIds)
        .select('*');

      if (updateError) {
        console.error('Error updating fines:', updateError);
        return NextResponse.json(
          { error: 'Failed to update fines' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Successfully updated ${fineIds.length} fine(s)`,
        updated_count: data?.length || 0,
        fines: data
      });
    }

  } catch (error) {
    console.error('Bulk update fines error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
