import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const sessionCookie =
    request.cookies.get('better-auth.session_token') ??
    request.cookies.get('__Secure-better-auth.session_token');

  // Redirect unauthenticated users to sign-in (except public paths)
  if (!isPublic && !sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (isPublic && sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.delete('redirect');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
