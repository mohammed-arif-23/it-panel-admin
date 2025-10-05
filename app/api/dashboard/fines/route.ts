import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { holidayService } from '../../../../lib/holidayService';

// Simple fine calculation for new system: just return base amount
async function calculateSimpleFineAmount(fine: any): Promise<number> {
  // New system: fixed amount per day (₹10 for seminar no booking)
  return fine.base_amount || 10.00;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Get student fines
    const { data: fines, error: finesError } = await (supabase as any)
      .from('unified_student_fines')
      .select('*')
      .eq('student_id', studentId)
      .eq('payment_status', 'pending');

    if (finesError) {
      console.error('Error fetching fines:', finesError);
      return NextResponse.json(
        { error: 'Failed to fetch fines data' },
        { status: 500 }
      );
    }

    // Calculate total fine amount using simplified system
    const totalFines = await (fines || []).reduce(async (sumPromise: Promise<number>, fine: any) => {
      const sum = await sumPromise;
      const currentAmount = await calculateSimpleFineAmount(fine);
      return sum + currentAmount;
    }, Promise.resolve(0));

    return NextResponse.json({
      success: true,
      data: {
        fines: fines || [],
        stats: {
          totalFines: totalFines,
          pendingFinesCount: fines?.length || 0
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fines data fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}