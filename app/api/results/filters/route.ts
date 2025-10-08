import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export async function GET() {
  try {
    const collection = await getCollection('semester_result_sheets');

    // Get distinct values for filters
    const [batches, departments, years, semesters] = await Promise.all([
      collection.distinct('batch'),
      collection.distinct('department'),
      collection.distinct('year_num'),
      collection.distinct('semester')
    ]);

    // Sort values
    batches.sort();
    departments.sort();
    years.sort((a: number, b: number) => a - b);
    semesters.sort((a, b) => a - b);

    return NextResponse.json({
      batches,
      departments,
      years,
      semesters
    });

  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options. Please try again later.' },
      { status: 500 }
    );
  }
}
