import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    const tokenFromCookie = request.cookies.get('allgo_admin_token')?.value;
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    // Enforce ADMIN role access for protected routes
    const role = request.cookies.get('allgo_admin_role')?.value || 'ADMIN';
    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
