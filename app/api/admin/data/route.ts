import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyJWT } from '../../../../lib/auth';

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

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tables, joinType = 'smart_merge' } = await request.json();

    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co') {
      return NextResponse.json([
        { message: 'Supabase not configured', status: 'error', timestamp: new Date().toISOString() }
      ]);
    }

    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return NextResponse.json(
        { error: 'No tables specified for merging' },
        { status: 400 }
      );
    }

    if (tables.length === 1) {
      // Single table - just fetch all data
      const { data, error } = await supabaseAdmin
        .from(tables[0])
        .select('*')
        .limit(1000); // Limit to prevent huge queries

      if (error) {
        console.error(`Error fetching data from ${tables[0]}:`, error);
        return NextResponse.json(
          { error: `Failed to fetch data from ${tables[0]}`, details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(data || []);
    }

    // Multiple tables - attempt smart merging
    let mergedData: any[] = [];

    try {
      // Get the primary table (first one) with all its data
      const primaryTable = tables[0];
      const { data: primaryData, error: primaryError } = await supabaseAdmin
        .from(primaryTable)
        .select('*')
        .limit(1000);

      if (primaryError) {
        throw new Error(`Failed to fetch primary table ${primaryTable}: ${primaryError.message}`);
      }

      // Start with primary table data
      mergedData = primaryData || [];

      // For each additional table, try to merge based on common columns
      for (let i = 1; i < tables.length; i++) {
        const tableName = tables[i];
        
        // Get data from the additional table
        const { data: additionalData, error: additionalError } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1000);

        if (additionalError) {
          console.warn(`Warning: Failed to fetch ${tableName}:`, additionalError.message);
          continue;
        }

        if (!additionalData || additionalData.length === 0) {
          continue;
        }

        // Simple merge strategy: try to find common ID fields
        const primaryKeys = Object.keys(mergedData[0] || {});
        const additionalKeys = Object.keys(additionalData[0] || {});
        
        // Look for common key fields (id, student_id, user_id, etc.)
        const commonKeys = primaryKeys.filter(key => 
          additionalKeys.includes(key) && 
          (key.includes('id') || key === 'register_number' || key === 'email')
        );

        if (commonKeys.length > 0) {
          // Merge based on the first common key
          const mergeKey = commonKeys[0];
          
          mergedData = mergedData.map(primaryRow => {
            // Find matching rows in additional data
            const matchingRows = additionalData.filter(addRow => 
              addRow[mergeKey] === primaryRow[mergeKey]
            );
            
            if (matchingRows.length > 0) {
              // Merge data, prefixing additional table columns to avoid conflicts
              const mergedRow = { ...primaryRow };
              matchingRows.forEach((matchRow, index) => {
                Object.keys(matchRow).forEach(key => {
                  const newKey = index === 0 ? 
                    `${tableName}_${key}` : 
                    `${tableName}_${index}_${key}`;
                  mergedRow[newKey] = matchRow[key];
                });
              });
              return mergedRow;
            }
            
            return primaryRow;
          });
        } else {
          // No common keys found - append as separate entries with table prefix
          const prefixedAdditionalData = additionalData.map(row => {
            const prefixedRow: any = {};
            Object.keys(row).forEach(key => {
              prefixedRow[`${tableName}_${key}`] = row[key];
            });
            return prefixedRow;
          });
          
          // Add to merged data
          mergedData = [...mergedData, ...prefixedAdditionalData];
        }
      }

      return NextResponse.json(mergedData);

    } catch (mergeError) {
      console.error('Error during table merging:', mergeError);
      
      // Fallback: return data from individual tables with prefixes
      let fallbackData: any[] = [];
      
      for (const tableName of tables) {
        try {
          const { data, error } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .limit(500); // Smaller limit for fallback

          if (!error && data) {
            const prefixedData = data.map(row => {
              const prefixedRow: any = {};
              Object.keys(row).forEach(key => {
                prefixedRow[`${tableName}_${key}`] = row[key];
              });
              return prefixedRow;
            });
            fallbackData = [...fallbackData, ...prefixedData];
          }
        } catch (tableError) {
          console.warn(`Failed to fetch fallback data from ${tableName}:`, tableError);
        }
      }

      return NextResponse.json(fallbackData);
    }

  } catch (error) {
    console.error('Data merge error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during table merging',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}