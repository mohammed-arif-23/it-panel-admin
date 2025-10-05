import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { verifyJWT } from "../../../../lib/auth";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const classYear = searchParams.get("class") || "all";
    const search = searchParams.get("search") || "";

    let query = (supabaseAdmin as any)
      .from("unified_students")
      .select("id, register_number, name, email, class_year, total_fine_amount")
      .order("register_number");

    if (classYear !== "all") {
      query = query.eq("class_year", classYear);
    }

    if (search) {
      // naive search over name or register number
      query = query.or(`name.ilike.%${search}%,register_number.ilike.%${search}%`);
    }

    const { data: students, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optionally compute pending fines count per student
    // Skipping heavy joins here for performance

    return NextResponse.json({
      success: true,
      data: students || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "recalc_all":
        return await recalcAllTotals();
      case "set_total":
        return await setStudentTotal(data);
      case "increment_total":
        return await adjustStudentTotal(data, +1);
      case "decrement_total":
        return await adjustStudentTotal(data, -1);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function recalcAllTotals() {
  // Sum pending fines per student and update unified_students.total_fine_amount
  try {
    const { data: sums, error: sumError } = await (supabaseAdmin as any)
      .from("unified_student_fines")
      .select("student_id, base_amount, payment_status");

    if (sumError) {
      return NextResponse.json({ error: sumError.message }, { status: 500 });
    }

    const map = new Map<string, number>();
    for (const row of sums || []) {
      if ((row as any).payment_status === "pending") {
        const sid = (row as any).student_id as string;
        const amt = ((row as any).base_amount || 0) as number;
        map.set(sid, (map.get(sid) || 0) + amt);
      }
    }

    // Fetch all student ids to also zero those with no pending fines
    const { data: students } = await (supabaseAdmin as any)
      .from("unified_students")
      .select("id");

    const updates = [] as Array<Promise<any>>;
    for (const s of students || []) {
      const sid = (s as any).id as string;
      const total = map.get(sid) || 0;
      updates.push(
        (supabaseAdmin as any)
          .from("unified_students")
          .update({ total_fine_amount: total })
          .eq("id", sid)
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true, updated: (students || []).length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to recalculate totals", details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function setStudentTotal(data: any) {
  const { student_id, total } = data || {};
  if (!student_id || typeof total !== "number" || total < 0) {
    return NextResponse.json(
      { error: "student_id and non-negative total are required" },
      { status: 400 }
    );
  }

  const { error } = await (supabaseAdmin as any)
    .from("unified_students")
    .update({ total_fine_amount: total })
    .eq("id", student_id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update total", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

async function adjustStudentTotal(data: any, sign: 1 | -1) {
  const { student_id, amount } = data || {};
  if (!student_id || typeof amount !== "number" || amount < 0) {
    return NextResponse.json(
      { error: "student_id and non-negative amount are required" },
      { status: 400 }
    );
  }

  const { data: s } = await (supabaseAdmin as any)
    .from("unified_students")
    .select("total_fine_amount")
    .eq("id", student_id)
    .single();

  const current = (s?.total_fine_amount ?? 0) as number;
  const next = Math.max(0, current + sign * amount);

  const { error } = await (supabaseAdmin as any)
    .from("unified_students")
    .update({ total_fine_amount: next })
    .eq("id", student_id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to adjust total", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, total: next });
}