import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

export function checkRateLimit(request: NextRequest): { allowed: boolean; resetTime: number } {
  const ip = getClientIp(request);
  const now = Date.now();
  
  const entry = rateLimitStore.get(ip);
  
  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, resetTime: now + WINDOW_MS };
  }
  
  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, resetTime: entry.resetTime };
  }
  
  entry.count++;
  return { allowed: true, resetTime: entry.resetTime };
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback to a default IP for local development
  return '127.0.0.1';
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, WINDOW_MS);
