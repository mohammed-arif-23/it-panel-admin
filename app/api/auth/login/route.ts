import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export async function POST(request: NextRequest) {
  try {
    const { role, password } = await request.json();

    // Get passwords from environment variables
    const hodPassword = process.env.HOD_PASSWORD;
    const staffPassword = process.env.STAFF_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';

    // Validate credentials
    let isValid = false;
    if (role === 'HOD' && password === hodPassword) {
      isValid = true;
    } else if (role === 'STAFF' && password === staffPassword) {
      isValid = true;
    }

    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401 });
    }

    // Generate JWT token using jose library
    const secretKey = new TextEncoder().encode(jwtSecret);
    const token = await new SignJWT({ role: role, timestamp: Date.now() })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secretKey);

    return NextResponse.json({
      success: true,
      token: token,
      role: role,
      message: `Successfully authenticated as ${role}`
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Authentication failed'
    }, { status: 500 });
  }
}