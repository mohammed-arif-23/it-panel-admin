import { jwtVerify } from 'jose';

// Function to verify JWT using jose library (Edge Runtime compatible)
export async function verifyJWT(token: string) {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const secretKey = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secretKey);
    return payload as { role: 'HOD' | 'STAFF' };
  } catch (error) {
    console.error('JWT verification error:', error);
    throw error;
  }
}