import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: 'No token provided'
      }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as { role: 'HOD' | 'STAFF'; timestamp: number };

    return NextResponse.json({
      success: true,
      authenticated: true,
      role: decoded.role,
      timestamp: decoded.timestamp
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      authenticated: false,
      error: 'Invalid token'
    }, { status: 401 });
  }
}
