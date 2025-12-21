import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Public paths that don't require authentication
    const publicPaths = ['/login', '/signup', '/auth/check-email', '/auth/callback'];
    const path = request.nextUrl.pathname;

    // Check if the path is static resource or public
    if (
        path.startsWith('/_next') ||
        path.startsWith('/static') ||
        path.includes('.') || // Files like favicon.ico, logo.png
        publicPaths.includes(path)
    ) {
        return NextResponse.next();
    }

    // Check for auth token in cookies
    const token = request.cookies.get('token')?.value;

    if (!token) {
        // Redirect to login if accessing protected route without token
        const url = new URL('/login', request.url);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
