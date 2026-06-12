# Supabase setup for "Add tournament"

Two one-time steps enable the in-app importer. Run them against the project
referenced in `src/lib/supabase.ts`.

## 1. Database tables + policies

Run `migrations/0001_community.sql` in the Supabase SQL editor (or
`supabase db push`). It creates:

- `community_tournaments` — one row per imported tournament (`id` = the
  americano-padel `/r/<uuid>`, so re-importing upserts).
- `community_aliases` — a single row holding the shared name-merge map.

RLS is open for read **and** write to the `anon` role, matching the
client-side-secret model (the "Add tournament" page is gated only by the
`padel-admin` word). Tighten later by moving writes behind an edge function
with a server-side secret.

## 2. Edge function (CORS-bypassing fetch proxy)

```bash
supabase functions deploy fetch-americano --no-verify-jwt
```

The app can't fetch americano-padel.com directly from the browser
(cross-origin). `fetch-americano` fetches the round page server-side and
returns its raw HTML; all parsing happens in the client
(`src/parser/americanoPadelHtml.ts`). It only accepts
`https://americano-padel.com/r/<id>` URLs, so it isn't an open proxy.

Until both steps are done, the importer shows a friendly error and the rest of
the app is unaffected (it still loads the baked-in history).
