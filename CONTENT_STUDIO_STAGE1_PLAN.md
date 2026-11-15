# Reliable Content Studio — Stage 1 Implementation Plan

## Current architecture findings

Reliable Premium Marketplace is a React 19 + Vite + TypeScript application using Supabase Auth, PostgreSQL, Storage, and Vercel. The main application router is in `src/App.tsx`. The existing dashboard is `src/pages/Admin.tsx`, which currently supports both seller and administrator views through a large in-page view switch. Existing protected routing distinguishes authenticated users, sellers, and administrators.

The current role model in the live database is `admin`, `seller`, or `customer`. The existing `is_admin()` database helper checks the `profiles.role = 'admin'` value. The frontend also recognizes `general_admin` in a few administrative modules, but the live `profiles.role` check constraint currently does not include that value. The first Content Studio security implementation should therefore use the live `admin` role consistently and introduce a separate explicit-access table for future delegated administrators rather than silently broadening the current role model.

The live Supabase project is the marketplace project `iwouhwizzwwykchgflyk` (Blue Water Shopping Village 1). Existing storage buckets include public product/media buckets and private identity/business-document buckets. No Content Studio tables or dedicated private media bucket currently exist.

## Safety boundaries

The Content Studio will be additive and isolated. It will not replace the existing marketplace dashboard, authentication, product flow, seller flow, checkout, Paystack integration, orders, payouts, or storage buckets. Existing routes and database records will remain unchanged. New database changes will be supplied as a separate migration and applied only after review.

No provider secret, rendering credential, voice credential, or AI credential will be placed in frontend code, Vite variables, public tables, or the repository. Provider calls will be made through server-side Vercel endpoints or Supabase Edge Functions, with request validation, authenticated authorization, rate limits, job status tracking, retries, and failure handling.

## Proposed navigation and access model

1. Add a lazy-loaded `ReliableContentStudio` module and a dedicated `/admin/content-studio` route.
2. Keep the existing `/admin` and `/dashboard` routes intact.
3. Add a `RELIABLE CONTENT STUDIO` item to the administrator dashboard navigation only. Sellers and customers will not see the item.
4. Protect the route in the frontend with an administrator/access check, but treat that only as a usability guard.
5. Enforce access again in every data operation, upload policy, rendering endpoint, and webhook.
6. Add an additive `content_studio_access` table with `user_id`, `access_level`, `active`, `granted_by`, `created_at`, and `updated_at`. A security-definer function will allow access for the platform owner/admin account and explicitly active delegated administrators. The initial owner authorization must be confirmed against the existing admin account before the migration is applied.
7. Use a private `content-studio-assets` Storage bucket. Storage object paths will be namespaced by authenticated user/project, and policies will permit only authorized Content Studio administrators.

## Staged implementation

### Stage 2 — Secure shell and workspace UI

Create a dedicated page and components instead of adding another large branch to `Admin.tsx`:

- Studio home dashboard
- Create project action
- Recent projects
- Draft/rendering/completed counts
- Media library entry
- Voiceover entry
- Export history entry
- Professional empty, loading, and error states
- Responsive desktop-first workspace layout using the existing blue, white, and yellow brand system

At this stage, the project records and navigation should be real, while generation/rendering buttons should not claim functionality that has not yet been connected.

### Stage 3 — Projects and private media library

Add only the tables required for durable project management:

- `content_projects`: owner, name, type, status, aspect ratio, settings JSON, timestamps
- `content_assets`: project/owner, asset kind, storage path, MIME type, size, duration, metadata JSON, timestamps
- `content_templates`: reusable internal templates and version metadata

Add RLS policies for authorized Content Studio administrators, pagination, lazy previews, upload-size/type validation, delete confirmation, and storage usage summaries. Use Supabase Storage signed URLs for private assets. Avoid duplicating files when an existing asset can be referenced.

### Stage 4 — Real compositions and animation preview

Start with one working, bounded workflow rather than pretending to provide a full editor:

- A template-based promotional composition
- Editable title, subtitle, CTA, logo, product image, colors, duration, and aspect ratio
- Animated text and simple transitions
- A preview generated from the same composition definition used for export
- Project save/reopen/duplicate/delete

Investigate Remotion for React-based compositions. Keep the composition schema provider-neutral so the renderer can change later. A full multi-track editor should only be added after a supported timeline/rendering SDK is selected.

### Stage 5 — AI script and voiceover providers

Add provider adapters rather than hard-coding a single vendor:

- Script generation adapter
- Text-to-speech adapter
- Optional subtitle/timing adapter

The UI will show provider configuration status and clearly distinguish configured features from unavailable ones. Credentials remain server-side. Voice previews and generated audio will be stored as private assets.

### Stage 6 — Rendering and HD export

Add `content_render_jobs` and `content_exports` only when the first renderer is selected. The server-side job flow will validate the project, enqueue/render, verify webhooks, track progress, retry safe failures, and store the final export privately. Export presets will cover 9:16, 1:1, 4:5, and 16:9 with 720p/1080p options; 4K will remain conditional on provider support and cost.

The first acceptance workflow should produce a genuine downloadable MP4, not a simulated progress bar. Rendering cost and provider requirements will be shown before a paid operation where the provider supports that information.

### Stage 7 — Graphics and thumbnails

Reuse the project/assets model for editable promotional graphics and thumbnails. Start with a small set of reliable templates for TikTok/Reels covers, YouTube thumbnails, marketplace product ads, and social posters. Export should use deterministic server-side rendering for exact text and layout.

### Stage 8 — Optional publishing integrations

Initially provide download and manual-upload instructions only. Direct TikTok, Facebook, Instagram, or YouTube publishing will be considered separately and only after official API permissions, OAuth authorization, provider configuration, and end-to-end testing are available.

## Provider decision gate

Before implementing paid generation or rendering, confirm which services the owner wants to configure and pay for. The likely categories are:

- Video composition/rendering: Remotion-based worker or Shotstack
- AI video generation: a supported provider with an account/API key
- Voiceover: a supported TTS provider
- Script generation: a server-side LLM provider
- Storage: existing Supabase Storage with a private Content Studio bucket

The application will ship useful project management and template composition without automatically enabling paid AI subscriptions.

## Database and security review requirements

Before applying the migration:

- Confirm the platform owner’s current Supabase user ID and existing admin profile.
- Review the final tables, indexes, RLS policies, storage policies, and security-definer function.
- Confirm delegated access cannot be self-granted by a customer, seller, or ordinary admin without the intended grant path.
- Ensure provider secrets are absent from tables accessible through the Data API.
- Add explicit grants for new public-schema tables in the same migration.
- Test authorized admin, unauthorized admin/customer, seller, signed-out, and expired-session paths.

## Validation and deployment gates

After each stage:

- Run `pnpm run typecheck` and `pnpm run build`.
- Review the diff for unrelated marketplace changes.
- Verify existing customer, seller, admin, checkout, product, and order routes remain intact.
- Verify Content Studio data is inaccessible to customers and sellers through direct API calls.
- Confirm private media cannot be fetched without an authorized signed URL.
- Deploy only through the existing GitHub-to-Vercel workflow after the stage passes.

## Initial recommendation

Proceed with Stage 2 first: add the isolated admin-only Content Studio shell, explicit-access migration, project dashboard, and a real project create/save flow. Do not add AI video, voiceover, or paid rendering integrations until the owner confirms the preferred providers and credentials/subscriptions. This delivers a useful foundation while minimizing cost and protecting the live marketplace.
