import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWT } from '../../../../lib/auth';

// Use service role key for full database access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all table names from public schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
      .order('table_name');

    if (tablesError) {
      throw new Error(`Failed to fetch tables: ${tablesError.message}`);
    }

    // Get record counts for each table
    const tableAnalysis = [];
    
    for (const table of tables || []) {
      try {
        // Get record count
        const { count, error: countError } = await supabase
          .from(table.table_name)
          .select('*', { count: 'exact', head: true });

        if (countError) {
          console.warn(`Failed to count records in ${table.table_name}:`, countError.message);
          tableAnalysis.push({
            table_name: table.table_name,
            record_count: 'Error',
            error: countError.message
          });
        } else {
          tableAnalysis.push({
            table_name: table.table_name,
            record_count: count || 0
          });
        }
      } catch (error) {
        console.warn(`Failed to analyze table ${table.table_name}:`, error);
        tableAnalysis.push({
          table_name: table.table_name,
          record_count: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Get column information for key tables
    const keyTables = [
      'unified_students',
      'unified_student_registrations', 
      'unified_seminar_bookings',
      'unified_seminar_selections',
      'assignments',
      'assignment_submissions',
      'unified_student_fines'
    ];

    const tableStructures: Record<string, any> = {};

    for (const tableName of keyTables) {
      try {
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_schema', 'public')
          .eq('table_name', tableName)
          .order('ordinal_position');

        if (!columnsError && columns) {
          tableStructures[tableName] = columns;
        }
      } catch (error) {
        console.warn(`Failed to get structure for ${tableName}:`, error);
      }
    }

    // Summary statistics
    const totalTables = tableAnalysis.length;
    const totalRecords = tableAnalysis
      .filter(t => typeof t.record_count === 'number')
      .reduce((sum, t) => sum + (t.record_count as number), 0);
    
    const tablesWithData = tableAnalysis.filter(t => 
      typeof t.record_count === 'number' && t.record_count > 0
    ).length;

    const summary = {
      total_tables: totalTables,
      tables_with_data: tablesWithData,
      empty_tables: totalTables - tablesWithData,
      total_records: totalRecords,
      analysis_timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        tables: tableAnalysis.sort((a, b) => {
          if (typeof a.record_count === 'number' && typeof b.record_count === 'number') {
            return b.record_count - a.record_count;
          }
          return 0;
        }),
        structures: tableStructures
      }
    });

  } catch (error) {
    console.error('Database analysis error:', error);
    return NextResponse.json({
      error: 'Failed to analyze database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}