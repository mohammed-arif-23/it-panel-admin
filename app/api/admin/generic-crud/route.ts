import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'

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

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    const limit = Number(searchParams.get('limit') || '100')
    const offset = Number(searchParams.get('offset') || '0')
    const orderBy = searchParams.get('orderBy') || 'created_at'
    const orderAsc = (searchParams.get('orderAsc') || 'false') === 'true'

    if (!table) return NextResponse.json({ error: 'Missing table' }, { status: 400 })

    const query = (supabaseAdmin as any)
      .from(table)
      .select('*', { count: 'exact' })
      .order(orderBy, { ascending: orderAsc })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ data: data || [], count: count ?? 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { table, values } = body || {}
    if (!table || !values) return NextResponse.json({ error: 'Missing table/values' }, { status: 400 })

    const { data, error } = await (supabaseAdmin as any)
      .from(table)
      .insert(values)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { table, id, values, idColumn = 'id' } = body || {}
    if (!table || !id || !values) return NextResponse.json({ error: 'Missing table/id/values' }, { status: 400 })

    const { data, error } = await (supabaseAdmin as any)
      .from(table)
      .update(values)
      .eq(idColumn, id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { table, id, idColumn = 'id' } = body || {}
    if (!table || !id) return NextResponse.json({ error: 'Missing table/id' }, { status: 400 })

    const { error } = await (supabaseAdmin as any)
      .from(table)
      .delete()
      .eq(idColumn, id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}