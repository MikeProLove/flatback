import { clerkMiddleware } from '@clerk/nextjs';

export default clerkMiddleware();

export const config = {
  matcher: [
    // защищаем всё, кроме статики и публичной API
    '/((?!_next/static|_next/image|favicon.ico|api/public).*)',
  ],
};