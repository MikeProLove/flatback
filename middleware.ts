// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware({
  // страница входа/регистрации и главная — публичные
  publicRoutes: ['/', '/sign-in(.*)', '/sign-up(.*)'],
});

export const config = {
  matcher: [
    // пропускаем статические файлы и служебные пути
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // и всегда проверяем API
    '/(api|trpc)(.*)',
  ],
};
