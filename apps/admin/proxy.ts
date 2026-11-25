import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_ROUTES = ['/login'];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const tokenFromCookie = request.cookies.get('allgo_admin_token')?.value;
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  // Enforce ADMIN role access for protected routes
  const role = request.cookies.get('allgo_admin_role')?.value;
  const token = (tokenFromCookie || tokenFromHeader)?.trim();
  const isAuthenticated = Boolean(token) && (!role || role === 'ADMIN');

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // Redirect authenticated users away from auth routes (e.g. /login),
  // unless explicitly adding another account (?add_account=1) or recovering from an expired/revoked session
  if (isAuthRoute) {
    const isAddAccount = request.nextUrl.searchParams.get('add_account') === '1';
    const isSessionExpired = request.nextUrl.searchParams.get('session_expired') === '1';
    if (isSessionExpired) {
      const response = NextResponse.next();
      if (tokenFromCookie) {
        response.cookies.delete('allgo_admin_token');
      }
      return response;
    }
    if (isAuthenticated && !isAddAccount) {
      const redirectParam = request.nextUrl.searchParams.get('redirect');
      const isSafeRedirect =
        redirectParam &&
        redirectParam.startsWith('/') &&
        !redirectParam.startsWith('//') &&
        !AUTH_ROUTES.some((r) => redirectParam === r || redirectParam.startsWith(`${r}/`));
      return NextResponse.redirect(
        new URL(isSafeRedirect ? redirectParam : '/admin/dashboard', request.url),
      );
    }
    return NextResponse.next();
  }

  // Protect / and /admin/* routes
  if (pathname === '/' || pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      if (pathname !== '/') {
        loginUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export { proxy };

export const config = {
  matcher: ['/', '/admin/:path*', '/login'],
};
