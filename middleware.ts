import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Define role-based access permissions
const rolePermissions = {
  HOD: [
    '/admin',
    '/admin/qps',
    '/admin/lab-manuals',
    '/admin/notes',
    '/assignments', 
    '/detect-assignments',
    '/registration',
    '/bookings',
    '/holidays',
    '/history',
    '/fines',
    '/fine-students',
    '/notifications',
    '/notices',
    '/analytics',
    '/database',
    '/crud',
    '/performance',
    '/achievements',
    '/timetable'
  ],
  STAFF: [
    '/admin',
    '/admin/qps',
    '/admin/lab-manuals',
    '/admin/notes',
    '/assignments',
    '/registration', 
    '/bookings',
    '/holidays',
    '/history',
    '/notifications',
    '/notices',
    '/analytics'
  ]
};

// Function to verify JWT using jose library (Edge Runtime compatible)
async function verifyJWT(token: string, secret: string) {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    return payload as { role: 'HOD' | 'STAFF' };
  } catch (error) {
    console.error('JWT verification error:', error);
    throw error;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login page and API routes
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Check if accessing protected admin routes
  const protectedRoutes = ['/admin', '/admin/qps', '/admin/lab-manuals', '/admin/notes', '/assignments', '/detect-assignments', '/registration', 
                          '/bookings', '/holidays', '/history', '/fines', '/fine-students', 
                          '/notifications', '/notices', '/analytics', '/database', '/crud', 
                          '/performance', '/achievements', '/timetable'];

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    // Get token from cookie or header
    const token = request.cookies.get('authToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('No token found, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
      
      // Use Edge Runtime compatible JWT verification
      const decoded = await verifyJWT(token, jwtSecret);
      
      // Check role-based permissions
      const userRole = decoded.role;
      const allowedRoutes = rolePermissions[userRole] || [];
      
      const hasAccess = allowedRoutes.some(route => pathname.startsWith(route));
      
      if (!hasAccess) {
        console.log('Access denied, redirecting to admin with error');
        return NextResponse.redirect(new URL('/admin?error=access_denied', request.url));
      }

      // Add role to headers for use in components
      const response = NextResponse.next();
      response.headers.set('x-user-role', userRole);
      return response;

    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};