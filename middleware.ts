// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware({
  // публичные маршруты (доступны без авторизации)
  publicRoutes: ['/', '/sign-in(.*)', '/sign-up(.*)'],
});

export const config = {
  matcher: [
    // пропускаем статику и служебные файлы
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // всегда выполнять для API
    '/(api|trpc)(.*)',
  ],
};
