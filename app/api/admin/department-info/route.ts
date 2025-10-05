import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWT } from '@/lib/auth';

// Use service role key to bypass RLS for admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Admin auth guard
async function checkAdminAuth(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return false;
    const payload = await verifyJWT(token);
    return payload.role === 'HOD' || payload.role === 'STAFF';
  } catch (e) {
    console.error('JWT verification error:', e);
    return false;
  }
}

// Expected table schema (create this in Supabase):
// table: department_info
// columns:
// - id: text (primary key) e.g., 'default'
// - vision: text
// - mission: text
// - staff: jsonb (array of { name, designation, position, imageUrl })
// - updated_at: timestamptz

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { data, error } = await supabase
      .from('department_info')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error && error.code !== 'PGRST116') { // not found
      console.error('Fetch department_info error:', error);
      return NextResponse.json({ error: 'Failed to fetch department info' }, { status: 500 });
    }

    // Ensure arrays for vision and mission on response
    const normalized = data
      ? {
          ...data,
          vision: Array.isArray((data as any).vision)
            ? (data as any).vision
            : (data as any).vision
            ? [(data as any).vision]
            : [],
          mission: Array.isArray((data as any).mission)
            ? (data as any).mission
            : (data as any).mission
            ? [(data as any).mission]
            : [],
        }
      : { id: 'default', vision: [], mission: [], staff: [], updated_at: null };

    return NextResponse.json({ success: true, data: normalized });
  } catch (err) {
    console.error('GET department-info error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    // Allow either direct fields or raw JSON payload
    const payload = body.payloadJson && typeof body.payloadJson === 'object'
      ? body.payloadJson
      : body;

    // Normalize to string arrays
    const visionArrRaw = Array.isArray(payload.vision)
      ? payload.vision
      : typeof payload.vision === 'string'
      ? [payload.vision]
      : [];
    const missionArrRaw = Array.isArray(payload.mission)
      ? payload.mission
      : typeof payload.mission === 'string'
      ? [payload.mission]
      : [];
    const vision = visionArrRaw
      .map((v: any) => String(v ?? '').trim())
      .filter((v: string) => v.length > 0);
    const mission = missionArrRaw
      .map((m: any) => String(m ?? '').trim())
      .filter((m: string) => m.length > 0);
    const staff = Array.isArray(payload.staff) ? payload.staff : [];

    // Basic sanitize staff entries
    const normalizedStaff = staff.map((s: any) => ({
      name: String(s.name || ''),
      designation: String(s.designation || ''),
      position: String(s.position || ''),
      imageUrl: String(s.imageUrl || ''),
    }));

    const upsertData = {
      id: 'default',
      vision,
      mission,
      staff: normalizedStaff,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('department_info')
      .upsert(upsertData, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      console.error('Upsert department_info error:', error);
      return NextResponse.json({ error: 'Failed to save department info' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('PUT department-info error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
