import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
      return NextResponse.json({ students: [] });
    }

    console.log('Student search query:', query);

    // TODO: Implement actual database search
    // This is mock data
    const mockStudents = [
      {
        id: '1',
        name: 'John Doe',
        register_number: '2021BCS001',
        class_year: 'II-IT'
      },
      {
        id: '2',
        name: 'Jane Smith',
        register_number: '2021BCS002',
        class_year: 'II-IT'
      },
      {
        id: '3',
        name: 'Alice Johnson',
        register_number: '2021BCS003',
        class_year: 'III-IT'
      },
      {
        id: '4',
        name: 'Bob Williams',
        register_number: '2021BCS004',
        class_year: 'III-IT'
      }
    ].filter(student => 
      student.name.toLowerCase().includes(query.toLowerCase()) ||
      student.register_number.toLowerCase().includes(query.toLowerCase())
    );

    return NextResponse.json({ students: mockStudents });
  } catch (error: any) {
    console.error('Student search error:', error);
    return NextResponse.json(
      { error: 'Failed to search students', message: error.message },
      { status: 500 }
    );
  }
}