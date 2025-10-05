import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { seminarTimingService } from "../../../../lib/seminarTimingService";

export async function GET() {
  try {
    const today = seminarTimingService.getTodayDate();
    const tomorrow = seminarTimingService.getNextSeminarDate();

    // Get today's selections (should show in "Today's Selection")
    const { data: todaySelections } = await supabaseAdmin
      .from("unified_seminar_selections")
      .select(
        `
        *,
        unified_students (register_number, name, class_year)
      `
      )
      .eq("seminar_date", today);

    // Get tomorrow's selections (should show in "Next Selection")
    const { data: tomorrowSelections } = await supabaseAdmin
      .from("unified_seminar_selections")
      .select(
        `
        *,
        unified_students (register_number, name, class_year)
      `
      )
      .eq("seminar_date", tomorrow);

    // Get past selections (should show in "Presenter History")
    const { data: pastSelections } = await supabaseAdmin
      .from("unified_seminar_selections")
      .select(
        `
        *,
        unified_students (register_number, name, class_year)
      `
      )
      .lt("seminar_date", today)
      .order("seminar_date", { ascending: false });

    return NextResponse.json({
      success: true,
      dates: {
        today: today + " (Monday)",
        tomorrow: tomorrow + " (Tuesday)",
      },
      ui_sections: {
        "Today's Selection": {
          description: "Students presenting today (Monday)",
          count: (todaySelections || []).length,
          students: (todaySelections || []).map((s: any) => ({
            name: s.unified_students?.name,
            register_number: s.unified_students?.register_number,
            class_year: s.unified_students?.class_year,
            seminar_date: s.seminar_date,
          })),
        },
        "Next Selection": {
          description: "Students selected for tomorrow (Tuesday)",
          count: (tomorrowSelections || []).length,
          students: (tomorrowSelections || []).map((s: any) => ({
            name: s.unified_students?.name,
            register_number: s.unified_students?.register_number,
            class_year: s.unified_students?.class_year,
            seminar_date: s.seminar_date,
          })),
        },
        "Presenter History": {
          description: "Students who presented in the past (before today)",
          count: (pastSelections || []).length,
          students: (pastSelections || []).slice(0, 5).map((s: any) => ({
            name: s.unified_students?.name,
            register_number: s.unified_students?.register_number,
            class_year: s.unified_students?.class_year,
            seminar_date: s.seminar_date,
          })),
        },
      },
      expected_behavior: {
        "Today's Selection":
          "Should show Jaissy.V and Sowmiga.A (Monday's seminar)",
        "Next Selection": "Should be empty (no selections for Tuesday yet)",
        "Presenter History": "Should show past presenters (before Monday)",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
