Password reset redirect verification (2026-08-11):

The Supabase Authentication URL Configuration initially had Site URL set to http://localhost:3000 and no redirect URLs, which caused reset links to open localhost and show ERR_CONNECTION_REFUSED on a phone.

The Site URL is now set to https://reliable-now.vercel.app, and the redirect allow-list contains https://reliable-now.vercel.app/reset-password. The setting page confirms Total URLs: 1.

The application code in src/context/AuthContext.tsx now uses VITE_PUBLIC_APP_URL when available, otherwise https://reliable-now.vercel.app, and sends resetPasswordForEmail redirects to /reset-password on that public origin rather than using window.location.origin. The local production build passed before deployment.

Supabase changes saved successfully: Site URL now shows https://reliable-now.vercel.app and the redirect list shows https://reliable-now.vercel.app/reset-password. Vercel deployment for commit bf9c895 is currently Building at preview https://reliable-mqginasr3-adamzak360-specs-projects.vercel.app; local build passed. Final live verification will be performed after the deployment reaches Ready.
