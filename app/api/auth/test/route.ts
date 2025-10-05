import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // Test JWT secret
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    
    // Generate a test token
    const testToken = jwt.sign(
      { 
        role: 'HOD',
        timestamp: Date.now()
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Try to verify the token
    const decoded = jwt.verify(testToken, jwtSecret);

    return NextResponse.json({
      success: true,
      message: 'JWT configuration is working correctly',
      testToken,
      decoded
    });

  } catch (error) {
    console.error('JWT Test Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}