import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';

// Fetch subject credits from Supabase database
async function getSubjectCreditsFromDB(): Promise<Record<string, number>> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('code, credits')
      .not('credits', 'is', null);
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    const creditsMap: Record<string, number> = {};
    subjects?.forEach((subject: any) => {
      if (typeof subject.credits === 'number' && subject.code) {
        creditsMap[subject.code] = subject.credits;
      }
    });
    
    return creditsMap;
  } catch (error) {
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimit = checkRateLimit(request);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetTime: rateLimit.resetTime },
        { status: 429 }
      );
    }

    // Fetch subject credits from Supabase database
    const creditsMap = await getSubjectCreditsFromDB();
    
    // Convert to array format for API response
    const subjects = Object.entries(creditsMap).map(([code, credits]) => ({
      code,
      credits
    }));

    return NextResponse.json({
      subjects: subjects,
      message: 'Subject credits fetched successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error while fetching subject credits' },
      { status: 500 }
    );
  }
}
