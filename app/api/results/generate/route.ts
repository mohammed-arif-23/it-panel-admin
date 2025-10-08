import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limiter';

interface GeneratePayload {
  batch: string;
  department: string;
  year: number; // numeric year for filtering
  year_label: string; // string to store in document e.g., "II-IT"
  semester: number;
  exam_cycle: string;
  class_year: string; // e.g., "I-T A", "2023-2027 Year-1"
  sheet_id?: number; // optional explicit id, else auto
  overwrite?: boolean; // if true, replace existing sheet
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const rl = checkRateLimit(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded', resetTime: rl.resetTime }, { status: 429 });
    }

    const body = (await request.json()) as Partial<GeneratePayload>;
    const { batch, department, year, year_label, semester, exam_cycle, class_year, sheet_id, overwrite } = body;

    // Validate required fields
    if (!batch || !department || year == null || semester == null || !exam_cycle || !class_year || !year_label) {
      return NextResponse.json({ error: 'Missing required fields: batch, department, year, semester, exam_cycle, class_year' }, { status: 400 });
    }

    const yearNum = Number(year);
    const semNum = Number(semester);
    if (Number.isNaN(yearNum) || Number.isNaN(semNum)) {
      return NextResponse.json({ error: 'year and semester must be numbers' }, { status: 400 });
    }

    // 1) Fetch subjects for department+semester (no year column in your schema)
    const { data: subjects, error: subjectsError } = await supabaseAdmin
      .from('subjects')
      .select('code, is_ncc_course')
      .eq('department', department)
      .eq('semester', semNum);

    if (subjectsError) {
      console.error('Supabase subjects error:', subjectsError);
      return NextResponse.json({ error: 'Failed to fetch subjects from Supabase' }, { status: 500 });
    }

    const subjectCodes: string[] = (subjects || [])
      .filter((s: any) => s?.is_ncc_course !== true)
      .map((s: any) => s.code)
      .filter(Boolean);

    if (subjectCodes.length === 0) {
      return NextResponse.json({ error: 'No subjects found for the provided filters' }, { status: 404 });
    }

    // 2) Fetch students for selected class
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('unified_students')
      .select('register_number,name')
      .eq('class_year', class_year);

    if (studentsError) {
      console.error('Supabase students error:', studentsError);
      return NextResponse.json({ error: 'Failed to fetch students from Supabase' }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'No students found for the selected class' }, { status: 404 });
    }

    // 3) Build result_data with empty grades
    const result_data = students.map((stu: any) => ({
      stu_reg_no: String(stu.register_number),
      stu_name: String(stu.name || ''),
      res_data: subjectCodes.reduce((acc: Record<string, string>, code: string) => {
        acc[code] = '';
        return acc;
      }, {})
    }));

    // 4) Insert into MongoDB (upsert if overwrite true)
    const collection = await getCollection('semester_result_sheets');

    const baseDoc = {
      sheet_id: sheet_id ?? Math.floor(Date.now() / 1000),
      department: department.trim(),
      year: String(year_label).trim(), // store as string per requirement
      year_num: yearNum, // helper for efficient querying
      semester: semNum,
      batch: String(batch).trim(),
      exam_cycle: String(exam_cycle).trim(),
      result_data
    };

    if (overwrite) {
      const upsertResult = await collection.updateOne(
        { batch: baseDoc.batch, department: baseDoc.department, year_num: baseDoc.year_num, semester: baseDoc.semester },
        { $set: baseDoc },
        { upsert: true }
      );

      return NextResponse.json({ success: true, upsertedId: upsertResult.upsertedId || null, matched: upsertResult.matchedCount, modified: upsertResult.modifiedCount });
    }

    // If not overwrite, ensure no duplicate
    const existing = await collection.findOne({ batch: baseDoc.batch, department: baseDoc.department, year_num: baseDoc.year_num, semester: baseDoc.semester });
    if (existing) {
      return NextResponse.json({ error: 'A sheet already exists for these filters. Use overwrite to replace.' }, { status: 409 });
    }

    const insertResult = await collection.insertOne(baseDoc as any);
    return NextResponse.json({ success: true, insertedId: insertResult.insertedId });
  } catch (e) {
    console.error('Error generating sheet:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
