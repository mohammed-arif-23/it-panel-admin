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

// Bulk delete fines by an explicit list of IDs
async function bulkDeleteByIds(data: any) {
  const { ids } = data || {};

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "ids must be a non-empty array" },
      { status: 400 }
    );
  }

  const uniqueIds = Array.from(new Set(ids)).filter(
    (id) => typeof id === "string" && id.trim().length > 0
  );

  if (uniqueIds.length === 0) {
    return NextResponse.json(
      { error: "No valid ids provided" },
      { status: 400 }
    );
  }

  // Fetch fines first to compute total decrements per student for pending fines
  const { data: finesToDelete } = await (supabaseAdmin as any)
    .from('unified_student_fines')
    .select('id, student_id, base_amount, payment_status')
    .in('id', uniqueIds)

  const { data: deleted, error } = await (supabaseAdmin as any)
    .from("unified_student_fines")
    .delete()
    .in("id", uniqueIds)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete fines", details: error.message },
      { status: 500 }
    );
  }

  // Decrement totals per student for pending fines
  try {
    const decMap = new Map<string, number>()
    for (const f of finesToDelete || []) {
      if ((f as any).payment_status === 'pending') {
        const sid = (f as any).student_id as string
        const amt = ((f as any).base_amount || 0) as number
        decMap.set(sid, (decMap.get(sid) || 0) + amt)
      }
    }
    for (const [sid, dec] of decMap.entries()) {
      const { data: s } = await (supabaseAdmin as any)
        .from('unified_students')
        .select('total_fine_amount')
        .eq('id', sid)
        .single()
      const current = (s?.total_fine_amount ?? 0) as number
      const next = Math.max(0, current - dec)
      await (supabaseAdmin as any)
        .from('unified_students')
        .update({ total_fine_amount: next })
        .eq('id', sid)
    }
  } catch (e) {
    console.warn('Failed to decrement totals for bulk delete')
  }

  return NextResponse.json({
    success: true,
    deleted_count: deleted?.length || 0,
    deleted_ids: (deleted || []).map((r: any) => r.id),
  });
}

// DELETE - Delete a fine by ID
export async function DELETE(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const idFromQuery = searchParams.get("id");
    const body = await request.text();
    let idFromBody: string | null = null;
    if (body) {
      try {
        const parsed = JSON.parse(body);
        idFromBody = parsed.id || parsed.fineId || null;
      } catch {
        // ignore body parse errors; we can rely on query param
      }
    }
    const fineId = idFromQuery || idFromBody;

    if (!fineId) {
      return NextResponse.json(
        { error: "Fine ID is required" },
        { status: 400 }
      );
    }

    // Fetch the fine to adjust totals appropriately
    const { data: fineBefore } = await (supabaseAdmin as any)
      .from('unified_student_fines')
      .select('id, student_id, base_amount, payment_status')
      .eq('id', fineId)
      .single()

    const { error } = await (supabaseAdmin as any)
      .from("unified_student_fines")
      .delete()
      .eq("id", fineId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete fine", details: error.message },
        { status: 500 }
      );
    }

    // Decrement student's outstanding total if the fine was pending
    if (fineBefore && fineBefore.payment_status === 'pending') {
      try {
        const sid = (fineBefore as any).student_id
        const delta = (fineBefore as any).base_amount || 0
        const { data: s } = await (supabaseAdmin as any)
          .from('unified_students')
          .select('total_fine_amount')
          .eq('id', sid)
          .single()
        const current = (s?.total_fine_amount ?? 0) as number
        const next = Math.max(0, current - delta)
        await (supabaseAdmin as any)
          .from('unified_students')
          .update({ total_fine_amount: next })
          .eq('id', sid)
      } catch (e) {
        console.warn('Failed to decrement total on delete for student', (fineBefore as any)?.student_id)
      }
    }

    return NextResponse.json({ success: true, id: fineId, message: "Fine deleted" });
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

// GET - Fetch fines with filters
export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if Supabase is properly configured
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ===
        "https://your-project.supabase.co"
    ) {
      return NextResponse.json({
        success: true,
        data: {
          fines: [],
          summary: {
            total_fines: 0,
            pending_fines: 0,
            paid_fines: 0,
            waived_fines: 0,
            total_amount: 0,
            pending_amount: 0,
            collected_amount: 0,
            by_type: {
              seminar_no_booking: 0,
              assignment_late: 0,
              attendance_absent: 0,
            },
            by_class: {
              "II-IT": 0,
              "III-IT": 0,
            },
          },
        },
        message:
          "Supabase not configured. Please set up your Supabase environment variables.",
        timestamp: new Date().toISOString(),
      });
    }

    const { searchParams } = new URL(request.url);
    const classYear = searchParams.get("class") || "all";
    const status = searchParams.get("status") || "all";
    const fineType = searchParams.get("type") || "all";
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");

    // Check if the fines table exists
    let finesExist = false;
    try {
      const { error: tableCheckError } = await supabaseAdmin
        .from("unified_student_fines")
        .select("id")
        .limit(1);

      finesExist = !tableCheckError;
    } catch (error) {
      console.log(
        "unified_student_fines table does not exist or is not accessible"
      );
      finesExist = false;
    }

    if (!finesExist) {
      return NextResponse.json({
        success: true,
        data: {
          fines: [],
          summary: {
            total_fines: 0,
            pending_fines: 0,
            paid_fines: 0,
            waived_fines: 0,
            total_amount: 0,
            pending_amount: 0,
            collected_amount: 0,
            by_type: {
              seminar_no_booking: 0,
              assignment_late: 0,
              attendance_absent: 0,
            },
            by_class: {
              "II-IT": 0,
              "III-IT": 0,
            },
          },
        },
        message: "Fines table not found. Please create the table first.",
        filters: { classYear, status, fineType, dateFrom, dateTo },
        timestamp: new Date().toISOString(),
      });
    }

    // Build query for fines with student details
    let finesQuery = (supabaseAdmin as any)
      .from("unified_student_fines")
      .select(
        `
        *,
        unified_students!student_id(
          id,
          register_number,
          name,
          email,
          class_year
        )
      `
      )
      .order("created_at", { ascending: false });

    // Apply filters
    if (classYear !== "all") {
      finesQuery = finesQuery.eq("unified_students.class_year", classYear);
    }

    if (status !== "all") {
      finesQuery = finesQuery.eq("payment_status", status);
    }

    if (fineType !== "all") {
      finesQuery = finesQuery.eq("fine_type", fineType);
    }

    if (dateFrom) {
      finesQuery = finesQuery.gte("reference_date", dateFrom);
    }

    if (dateTo) {
      finesQuery = finesQuery.lte("reference_date", dateTo);
    }

    const { data: fines, error: finesError } = await finesQuery;

    if (finesError) {
      console.error("Error fetching fines:", finesError);
      return NextResponse.json(
        { error: "Failed to fetch fines", details: finesError.message },
        { status: 500 }
      );
    }

    // Process fines with simplified system (₹10 per day)
    const processedFines = (fines || []).map((fine: any) => {
      const currentAmount = fine.base_amount || 10.0;

      return {
        ...fine,
        actual_days_overdue: 1, // Always 1 day in new system
        current_total_amount: currentAmount,
        needs_update: false, // No updates needed in simplified system
      };
    });

    // Calculate summary statistics
    const summary = {
      total_fines: processedFines.length,
      pending_fines: processedFines.filter(
        (f: any) => f.payment_status === "pending"
      ).length,
      paid_fines: processedFines.filter((f: any) => f.payment_status === "paid")
        .length,
      waived_fines: processedFines.filter(
        (f: any) => f.payment_status === "waived"
      ).length,
      total_amount: processedFines.reduce(
        (sum: number, f: any) => sum + f.current_total_amount,
        0
      ),
      pending_amount: processedFines
        .filter((f: any) => f.payment_status === "pending")
        .reduce((sum: number, f: any) => sum + f.current_total_amount, 0),
      collected_amount: processedFines
        .filter((f: any) => f.payment_status === "paid")
        .reduce((sum: number, f: any) => sum + (f.paid_amount || 0), 0),
      by_type: {
        seminar_no_booking: processedFines.filter(
          (f: any) => f.fine_type === "seminar_no_booking"
        ).length,
        assignment_late: processedFines.filter(
          (f: any) => f.fine_type === "assignment_late"
        ).length,
        attendance_absent: processedFines.filter(
          (f: any) => f.fine_type === "attendance_absent"
        ).length,
      },
      by_class: {
        "II-IT": processedFines.filter(
          (f: any) => f.unified_students?.class_year === "II-IT"
        ).length,
        "III-IT": processedFines.filter(
          (f: any) => f.unified_students?.class_year === "III-IT"
        ).length,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        fines: processedFines,
        summary,
      },
      filters: { classYear, status, fineType, dateFrom, dateTo },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Fines fetch error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Create new fines or update existing ones
export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "create_fine":
        return await createFine(data);
      case "update_fine":
        return await updateFine(data);
      case "create_manual_fine":
        return await createManualFine(data);
      case "update_status":
        return await updateFineStatus(data);
      case "bulk_delete_by_ids":
        return await bulkDeleteByIds(data);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Fines operation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Create a new fine (simplified system)
async function createFine(data: any) {
  const {
    studentId,
    fineType,
    referenceId,
    referenceDate,
    baseAmount = 10.0, // Fixed ₹10 per day
  } = data;

  if (!studentId || !fineType || !referenceDate) {
    return NextResponse.json(
      { error: "Missing required fields: studentId, fineType, referenceDate" },
      { status: 400 }
    );
  }

  // Check if fine already exists for this reference
  if (referenceId) {
    const { data: existingFine } = await (supabaseAdmin as any)
      .from("unified_student_fines")
      .select("id")
      .eq("student_id", studentId)
      .eq("reference_id", referenceId)
      .eq("fine_type", fineType)
      .single();

    if (existingFine) {
      return NextResponse.json(
        { error: "Fine already exists for this reference" },
        { status: 409 }
      );
    }
  }

  // Also prevent duplicates per (student, fineType, referenceDate)
  {
    const { data: existingForDate } = await (supabaseAdmin as any)
      .from("unified_student_fines")
      .select("id")
      .eq("student_id", studentId)
      .eq("fine_type", fineType)
      .eq("reference_date", referenceDate)
      .maybeSingle?.() ?? { data: null }; // compatible with older supabase clients

    if (existingForDate) {
      return NextResponse.json(
        { error: "Fine already exists for this student, type and date" },
        { status: 409 }
      );
    }
  }

  const { data: fine, error } = await (supabaseAdmin as any)
    .from("unified_student_fines")
    .insert({
      student_id: studentId,
      fine_type: fineType,
      reference_id: referenceId,
      reference_date: referenceDate,
      base_amount: baseAmount,
      daily_increment: 0.0, // No increments in new system
      days_overdue: 1, // Always 1 day in new system
      payment_status: "pending",
    })
    .select(
      `
      *,
      unified_students!student_id(
        id,
        register_number,
        name,
        class_year
      )
    `
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // New fine is pending; increment student's total
  try {
    const sid = (fine as any).student_id as string
    const addAmount = (fine as any).base_amount as number
    const { data: s } = await (supabaseAdmin as any)
      .from('unified_students')
      .select('total_fine_amount')
      .eq('id', sid)
      .single()
    const current = (s?.total_fine_amount ?? 0) as number
    await (supabaseAdmin as any)
      .from('unified_students')
      .update({ total_fine_amount: current + addAmount })
      .eq('id', sid)
  } catch (e) {
    console.warn('Failed to increment total on create for student', (fine as any).student_id)
  }

  return NextResponse.json({
    success: true,
    data: fine,
    message: "Fine created successfully",
  });
}

// Update an existing fine
async function updateFine(data: any) {
  const { fineId, paymentStatus, paidAmount, waivedBy, waivedReason } = data;

  if (!fineId) {
    return NextResponse.json({ error: "Fine ID is required" }, { status: 400 });
  }

  const updateData: any = {};

  // Fetch current fine to compute deltas for totals
  const { data: before } = await (supabaseAdmin as any)
    .from('unified_student_fines')
    .select('id, student_id, base_amount, payment_status')
    .eq('id', fineId)
    .single()

  // Update base amount if paidAmount is provided and we're not marking as paid
  if (paidAmount !== undefined && paymentStatus !== "paid") {
    updateData.base_amount = paidAmount;
  }

  if (paymentStatus) {
    updateData.payment_status = paymentStatus;

    if (paymentStatus === "paid") {
      // When marking as paid, use paidAmount or current base_amount
      if (paidAmount !== undefined) {
        updateData.paid_amount = paidAmount;
      }
      updateData.paid_at = new Date().toISOString();
    }

    if (paymentStatus === "waived") {
      updateData.waived_by = waivedBy;
      updateData.waived_reason = waivedReason;
      updateData.paid_at = new Date().toISOString();
    }
  }

  updateData.updated_at = new Date().toISOString();

  const { data: fine, error } = await (supabaseAdmin as any)
    .from("unified_student_fines")
    .update(updateData)
    .eq("id", fineId)
    .select(
      `
      *,
      unified_students!student_id(
        id,
        register_number,
        name,
        class_year
      )
    `
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Adjust student's total depending on changes
  try {
    if (before) {
      const sid = (before as any).student_id
      const prevStatus = (before as any).payment_status as string
      const prevAmount = (before as any).base_amount as number
      const newStatus = (fine as any).payment_status as string
      const newAmount = (fine as any).base_amount as number

      const { data: s } = await (supabaseAdmin as any)
        .from('unified_students')
        .select('total_fine_amount')
        .eq('id', sid)
        .single()
      const current = (s?.total_fine_amount ?? 0) as number
      let next = current

      if (prevStatus === 'pending' && newStatus === 'pending' && prevAmount !== newAmount) {
        next = Math.max(0, current - prevAmount + newAmount)
      }
      if (prevStatus === 'pending' && (newStatus === 'paid' || newStatus === 'waived')) {
        next = Math.max(0, next - prevAmount)
      }
      if ((prevStatus === 'paid' || prevStatus === 'waived') && newStatus === 'pending') {
        next = next + newAmount
      }

      if (next !== current) {
        await (supabaseAdmin as any)
          .from('unified_students')
          .update({ total_fine_amount: next })
          .eq('id', sid)
      }
    }
  } catch (e) {
    console.warn('Failed to adjust total on update for fine', fineId)
  }

  return NextResponse.json({
    success: true,
    data: fine,
    message: "Fine updated successfully",
  });
}

// Create manual fine
async function createManualFine(data: any) {
  const {
    student_id,
    fine_type,
    reference_date,
    amount = 10, // Fixed ₹10 per day
    description,
  } = data;

  if (!student_id || !fine_type || !reference_date) {
    return NextResponse.json(
      {
        error: "Missing required fields: student_id, fine_type, reference_date",
      },
      { status: 400 }
    );
  }

  // First verify the student exists
  const { data: student, error: studentError } = await (supabaseAdmin as any)
    .from("unified_students")
    .select("id, register_number, name, class_year")
    .eq("id", student_id)
    .single();

  if (studentError || !student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Prevent duplicate manual fines for same student/type/date
  {
    const { data: existing } = await (supabaseAdmin as any)
      .from("unified_student_fines")
      .select("id")
      .eq("student_id", student_id)
      .eq("fine_type", fine_type)
      .eq("reference_date", reference_date)
      .maybeSingle?.() ?? { data: null };

    if (existing) {
      return NextResponse.json(
        { error: "Fine already exists for this student, type and date" },
        { status: 409 }
      );
    }
  }

  // Insert the fine without embedding the relationship
  const { data: fine, error } = await (supabaseAdmin as any)
    .from("unified_student_fines")
    .insert({
      student_id,
      fine_type,
      reference_date,
      base_amount: amount,
      daily_increment: 0.0,
      days_overdue: 1,
      payment_status: "pending",
      description,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Manually attach the student data
  const fineWithStudent = {
    ...fine,
    unified_students: student,
  };

  // Increment student's total (pending fine)
  try {
    const sid = student_id
    const addAmount = amount
    const { data: s } = await (supabaseAdmin as any)
      .from('unified_students')
      .select('total_fine_amount')
      .eq('id', sid)
      .single()
    const current = (s?.total_fine_amount ?? 0) as number
    await (supabaseAdmin as any)
      .from('unified_students')
      .update({ total_fine_amount: current + addAmount })
      .eq('id', sid)
  } catch (e) {
    console.warn('Failed to increment total on manual create for student', student_id)
  }

  return NextResponse.json({
    success: true,
    data: fineWithStudent,
    message: "Manual fine created successfully",
  });
}

// Update fine status
async function updateFineStatus(data: any) {
  const { fineId, status, notes } = data;

  if (!fineId || !status) {
    return NextResponse.json(
      { error: "Missing required fields: fineId, status" },
      { status: 400 }
    );
  }

  const updateData: any = {
    payment_status: status,
    updated_at: new Date().toISOString(),
  };

  if (notes) {
    updateData.notes = notes;
  }

  if (status === "paid" || status === "waived") {
    updateData.paid_at = new Date().toISOString();
  }

  const { data: fine, error } = await (supabaseAdmin as any)
    .from("unified_student_fines")
    .update(updateData)
    .eq("id", fineId)
    .select(
      `
      *,
      unified_students!student_id(
        id,
        register_number,
        name,
        class_year
      )
    `
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: fine,
    message: "Fine status updated successfully",
  });
}