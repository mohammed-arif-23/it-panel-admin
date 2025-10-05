import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registerNumber, email, ipAddress } = body;

    if (!registerNumber && !email && !ipAddress) {
      return NextResponse.json(
        { error: 'At least one identifier (register number, email, or IP address) is required' },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [];
    if (registerNumber) conditions.push(`register_number.eq.${registerNumber}`);
    if (email) conditions.push(`email.eq.${email}`);
    if (ipAddress) conditions.push(`ip_address.eq.${ipAddress}`);

    // Check for active blocks
    let query = (supabase as any)
      .from('unified_blocked_registrations')
      .select('*')
      .or(conditions.join(','));

    // Add conditions for active blocks
    query = query.or(`is_permanent.eq.true,blocked_until.gt.${new Date().toISOString()}`);

    const { data: blocks, error: blockError } = await query
      .order('created_at', { ascending: false })
      .limit(1);

    if (blockError) {
      console.error('Block check error:', blockError);
      return NextResponse.json(
        { error: 'Failed to check block status' },
        { status: 500 }
      );
    }

    const activeBlock = blocks && blocks.length > 0 ? blocks[0] : null;

    if (activeBlock) {
      return NextResponse.json({
        isBlocked: true,
        blockReason: (activeBlock as any).block_reason,
        blockType: (activeBlock as any).block_type,
        blockedUntil: (activeBlock as any).blocked_until,
        isPermanent: (activeBlock as any).is_permanent,
        appealStatus: (activeBlock as any).appeal_status || 'none',
        message: (activeBlock as any).is_permanent 
          ? 'Your registration has been permanently blocked. Please contact administration.'
          : `Your registration is temporarily blocked until ${new Date((activeBlock as any).blocked_until).toLocaleString()}.`
      });
    }

    // Check rate limiting (multiple recent attempts from same IP)
    if (ipAddress) {
      const { data: recentAttempts, error: attemptsError } = await (supabase as any)
        .from('unified_registration_attempts')
        .select('id')
        .eq('ip_address', ipAddress)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .eq('attempt_status', 'failed');

      if (!attemptsError && recentAttempts && recentAttempts.length >= 5) {
        // Create temporary rate limit block
        await (supabase as any)
          .from('unified_blocked_registrations')
          .insert({
            ip_address: ipAddress,
            block_type: 'rate_limit',
            block_reason: 'Too many failed registration attempts',
            blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour block
            is_permanent: false
          });

        return NextResponse.json({
          isBlocked: true,
          blockReason: 'Too many failed registration attempts',
          blockType: 'rate_limit',
          blockedUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          isPermanent: false,
          message: 'Too many failed registration attempts. Please try again in 1 hour.'
        });
      }
    }

    return NextResponse.json({
      isBlocked: false,
      message: 'Registration is allowed'
    });

  } catch (error) {
    console.error('Block status check error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check block status by query parameters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const registerNumber = searchParams.get('registerNumber');
    const email = searchParams.get('email');
    const ipAddress = searchParams.get('ipAddress');

    // Delegate to POST method with the same logic
    return POST(new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        registerNumber,
        email,
        ipAddress
      })
    }));

  } catch (error) {
    console.error('Block status GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}