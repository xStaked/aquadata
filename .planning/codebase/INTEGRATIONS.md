# Integrations

## Summary

The codebase integrates with a small set of core external systems: `Supabase` for authentication and persistence, Google or gateway-backed LLMs for OCR and future AI workflows, and Colombia market-price sources through SIPSA-inspired flows. The current architecture keeps integrations behind local helpers and route handlers rather than a dedicated service layer.

## Supabase

Purpose:
- Authentication
- Session persistence
- Postgres CRUD
- Row-level-security-backed tenancy

Key files:
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `lib/supabase/proxy.ts`
- `proxy.ts`

Usage patterns:
- Server components and route handlers call `createClient()` from `lib/supabase/server.ts`
- Client components call `createClient()` from `lib/supabase/client.ts`
- The request proxy refreshes cookies and redirects unauthenticated `/dashboard` traffic to `/auth/login`

Representative consumers:
- `app/page.tsx`
- `app/dashboard/layout.tsx`
- `lib/auth/roles.ts`
- `hooks/use-bioremediation.ts`
- `app/api/market-prices/sync/route.ts`

## Database Schema / SQL Migrations

Integration style:
- SQL-first, checked into repo under `scripts/`
- No ORM layer is present
- Business features are often enabled by additive SQL files

Important tables referenced in docs or code:
- `organizations`
- `profiles`
- `ponds`
- `batches`
- `production_records`
- `uploads`
- `bioremediation_calcs`
- `market_prices`

Key files:
- `scripts/001_create_schema.sql`
- `scripts/003_market_prices_table.sql`
- `scripts/010_admin_module.sql`

## AI Provider Integration

Purpose:
- OCR extraction from production report images
- Future text-generation features can reuse the same provider abstraction

Key files:
- `lib/ai/provider.ts`
- `app/api/ocr/route.ts`

Current behavior:
- `lib/ai/provider.ts` exposes `getVisionModel()` and `getTextModel()`
- The OCR route uses `generateText` from the `ai` SDK and `Output.object()` with a `zod` schema
- Provider switching is centralized through the `ACTIVE_PROVIDER` constant

Implications:
- A DeepSeek chatbot would not fit the existing abstraction unless the provider catalog is extended or a separate route/service is introduced intentionally

## OCR Input/Output Contract

Input:
- `POST /api/ocr`
- JSON body with `imageBase64` and `mediaType`

Output:
- Structured JSON payload matching `productionDataSchema`
- Confidence scores per extracted field

Relevant file:
- `app/api/ocr/route.ts`

## SIPSA / Market Data

Purpose:
- Fetch or approximate Colombian market prices for aquaculture-relevant species

Files:
- `lib/sipsa/client.ts`
- `lib/market-data.ts`
- `app/api/market-prices/sync/route.ts`

Behavior notes:
- `lib/sipsa/client.ts` posts SOAP XML to `https://appweb.dane.gov.co/sipsaWS/SrvSipsaUpraBeanService`
- XML is parsed with string operations instead of a DOM parser to handle very large responses
- `app/api/market-prices/sync/route.ts` currently upserts curated in-code data and only pings SIPSA for connectivity
- `lib/market-data.ts` falls back to mock market prices if the table is missing, empty, or query access fails

## Authentication Flow

Login and role handling span:
- `app/auth/login/page.tsx`
- `app/auth/sign-up/page.tsx`
- `app/auth/callback/route.ts`
- `lib/auth/roles.ts`
- `app/dashboard/layout.tsx`
- `app/admin/layout.tsx`

Role enforcement:
- Middleware-like session handling protects `/dashboard/*`
- `lib/auth/roles.ts` adds admin-only enforcement for `/admin/*`
- Admin users are redirected away from the regular dashboard shell

## Public vs Protected Surfaces

Protected:
- `/dashboard/*`
- `/admin/*`
- most data-mutating routes under `app/api/*`

Public or semi-public:
- `/`
- `/auth/*`
- `/tools/bioremediation`

This matters for future AI features:
- A chatbot attached to `app/dashboard/bioremediation/page.tsx` can rely on authenticated context if kept inside dashboard
- A public chatbot for `/tools/bioremediation` would need rate-limiting and different security assumptions

## Missing / Implicit Integrations

There is no evidence of:
- background job queue
- analytics SaaS integration
- error monitoring SaaS
- test reporting platform
- vector database or retrieval layer

For a case-based chatbot, likely new integration candidates are:
- an AI inference provider with text chat support
- persistent storage for curated field cases and chat transcripts
- optional embedding or search support if retrieval becomes necessary later
