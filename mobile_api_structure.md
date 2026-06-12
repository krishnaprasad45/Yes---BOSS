# API Architecture & Data Fetching — Yes Boss Mobile (React Native)

> Adapted from the Guardian Super Admin Console reference (`api_structure.md`).
> That doc targets a React web app; this one targets the **bare React Native**
> app in `apps/mobile/`. Folder layout follows `project_rules.md` §4 (flat
> layers, not `domains/`). Pagination envelope follows `project_rules.md` §10
> (`Paginated<T>` with `itemCount`, from `packages/shared`).

**Stack assumed:** bare RN + TypeScript, React Navigation, TanStack React Query,
react-hook-form + Zod, `react-native-toast-message`, `react-native-keychain`
(token storage), `@react-native-community/netinfo` (offline detection).

---

## 0. What changed vs the web reference (read once)

| Web reference | Mobile (this doc) | Why |
|---|---|---|
| Custom `AsyncState` hooks + `reloadToken` + `cancelled` flag | **TanStack React Query** | Query gives caching, dedup, retries, refetch-on-reconnect/foreground, infinite scroll — all hand-rolled (badly) in the reference. Mandatory for mobile: airplane mode, app backgrounding, flaky networks. |
| `localStorage` for JWT | **react-native-keychain** | No `localStorage` in RN. Tokens are secrets → Keychain/Keystore, not AsyncStorage. |
| Sonner toasts | `react-native-toast-message` | Sonner is web-only. |
| TanStack Router file routes + `<head>` meta | **React Navigation** stacks/tabs | No file routing, no document head in RN. |
| Numbered `<Pagination>` component | **`FlatList` infinite scroll** (`onEndReached` → `useInfiniteQuery`) | Page numbers are a desktop pattern. |
| `src/domains/<feature>/` | Flat layers per `project_rules.md` §4 | Project rule wins. |
| `pages/` | `screens/` | RN convention + project rule. |
| `pagination.totalJob` | `pagination.itemCount` | `Paginated<T>` in `packages/shared` is the single source of truth. |

What carries over unchanged: **pure API functions layer**, `buildQueryString`,
types separation, Zod + react-hook-form, debounced search, one function per
endpoint, no try/catch in the API layer.

---

## 1. Folder Structure

Per `project_rules.md` §4, layers are flat; features are subfolders inside each
layer:

```
apps/mobile/src/
├─ services/
│  ├─ api/
│  │  ├─ client.ts              # apiFetch — shared wrapper, do not modify per feature
│  │  ├─ tokenStore.ts          # Keychain get/set/clear for JWT
│  │  ├─ calls.api.ts           # one file per backend resource
│  │  └─ smsTxns.api.ts
│  └─ queryClient.ts            # React Query client + online/focus managers
├─ hooks/
│  ├─ useDebounce.ts            # shared
│  ├─ useCalls.ts               # React Query hooks, one file per resource
│  └─ useSmsTxns.ts
├─ types/
│  ├─ api.types.ts              # ItemResponse<T>, ApiError (Paginated<T> comes from packages/shared)
│  ├─ calls.types.ts            # mobile-only params/UI types
│  └─ smsTxns.types.ts
├─ schema/
│  └─ autoReply.schema.ts       # Zod schemas for forms (settings, auto-reply message)
├─ components/
│  ├─ common/                   # zero feature knowledge (Button, Card, EmptyState)
│  └─ feature/                  # CallRow, SmsTxnCard, SpendChart
├─ screens/
│  ├─ CallsScreen.tsx           # smart containers — own filter state, call hooks
│  └─ SpendingScreen.tsx
├─ navigation/
│  └─ RootNavigator.tsx         # React Navigation stacks/tabs
└─ utils/
   ├─ constants.ts
   └─ formatters.ts             # dates, currency (₹), phone numbers
```

**Cross-boundary types** (`Call`, `SmsTxn`, request/response contracts,
`Paginated<T>`) live in `packages/shared` — never duplicated here.
`src/types/` holds mobile-only types (list params, UI state shapes).

---

## 2. API Client (`services/api/client.ts`)

Native `fetch` wrapper. Differences from the web reference: token comes from
**Keychain (async)**, and 401 triggers a **single-flight token refresh** —
mobile sessions live for weeks, so refresh is not optional.

```ts
// services/api/tokenStore.ts
import * as Keychain from "react-native-keychain";

const SERVICE = "yes-boss-auth";

export async function getTokens(): Promise<{ access: string; refresh: string } | null> {
  const creds = await Keychain.getGenericPassword({ service: SERVICE });
  return creds ? JSON.parse(creds.password) : null;
}

export async function setTokens(tokens: { access: string; refresh: string }) {
  await Keychain.setGenericPassword("tokens", JSON.stringify(tokens), { service: SERVICE });
}

export async function clearTokens() {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
```

```ts
// services/api/client.ts
import { getTokens, setTokens, clearTokens } from "./tokenStore";

const BASE_URL = process.env.API_URL ?? "http://10.0.2.2:3000"; // Android emulator → host

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

// Single-flight refresh: concurrent 401s share one refresh request.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const tokens = await getTokens();
      if (!tokens) throw new ApiError(401, "Not authenticated");
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refresh }),
      });
      if (!res.ok) {
        await clearTokens(); // refresh dead → force re-login
        throw new ApiError(401, "Session expired");
      }
      const json = await res.json();
      await setTokens({ access: json.data.accessToken, refresh: json.data.refreshToken });
      return json.data.accessToken as string;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<TResponse>(
  path: string,
  options: RequestInit = {},
  _retried = false,
): Promise<TResponse> {
  const tokens = await getTokens();
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(tokens ? { Authorization: `Bearer ${tokens.access}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !_retried) {
    await refreshAccessToken();
    return apiFetch<TResponse>(path, options, true);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, json?.message ?? `Request failed (${res.status})`);
  }
  return json as TResponse;
}
```

Rules:

- File uploads (call recordings, photos) use `FormData` — `apiFetch` skips the
  JSON content-type automatically. For large audio, consider
  `react-native-background-upload` later; start with `FormData`.
- No business logic in the client. No toasts in the client.

---

## 3. API Layer (`services/api/<resource>.api.ts`)

Identical philosophy to the web reference: **pure async functions, one per
endpoint, no React, no try/catch** — errors propagate to React Query.

```ts
// services/api/calls.api.ts
import { apiFetch } from "./client";
import type { Paginated, Call } from "@yes-boss/shared";
import type { ItemResponse } from "@/types/api.types";
import type { CallListParams } from "@/types/calls.types";

function buildQueryString(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      sp.append(key, String(value));
    }
  }
  return sp.toString();
}

const BASE = "/api/v1/calls";

export async function listCalls(params: CallListParams): Promise<Paginated<Call>> {
  const qs = buildQueryString(params);
  return apiFetch<Paginated<Call>>(`${BASE}${qs ? `?${qs}` : ""}`);
}

export async function getCall(id: string): Promise<ItemResponse<Call>> {
  return apiFetch<ItemResponse<Call>>(`${BASE}/${id}`);
}

export async function uploadCallRecording(form: FormData): Promise<ItemResponse<Call>> {
  return apiFetch<ItemResponse<Call>>(`${BASE}/recordings`, {
    method: "POST",
    body: form,
  });
}

export async function deleteCall(id: string): Promise<ItemResponse<null>> {
  return apiFetch<ItemResponse<null>>(`${BASE}/${id}`, { method: "DELETE" });
}
```

Rules (same as reference):

- One function per endpoint. Params and responses fully typed.
- Contract types (`Call`, `SmsTxn`, `Paginated<T>`) imported from
  `@yes-boss/shared`. Param types from `src/types/`.
- GET params → `buildQueryString()`. JSON body → `JSON.stringify()`. Files → `FormData`.
- No try/catch, no token handling here.

---

## 4. Query Client Setup (`services/queryClient.ts`)

This is the mobile-critical part the web reference doesn't have. Wire React
Query to RN's network and app-state signals once, at startup:

```ts
import { QueryClient, onlineManager, focusManager } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";

// Refetch when connectivity returns (airplane mode off, wifi back).
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

// Refetch stale queries when app returns to foreground.
AppState.addEventListener("change", (status) => {
  focusManager.setFocused(status === "active");
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // 1 min — dashboard data doesn't change mid-scroll
      gcTime: 24 * 60 * 60_000, // keep cache a day for instant cold renders
      retry: 2,
    },
  },
});
```

Wrap the app root in `<QueryClientProvider client={queryClient}>`.

---

## 5. Hooks Layer (`hooks/use<Resource>.ts`)

React Query replaces the entire `AsyncState` / `reloadToken` / `cancelled`-flag
machinery from the web reference.

**Query keys:** `["<resource>", params]` for lists, `["<resource>", id]` for
details. Params object inside the key = automatic refetch when filters change —
no `useEffect`, no dependency arrays.

```ts
// hooks/useCalls.ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { listCalls, getCall, deleteCall } from "@/services/api/calls.api";
import type { CallListFilters } from "@/types/calls.types";

const PAGE_SIZE = 20;

export function useCallList(filters: CallListFilters) {
  return useInfiniteQuery({
    queryKey: ["calls", filters],
    queryFn: ({ pageParam }) =>
      listCalls({ ...filters, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
  });
}

export function useCallDetails(id: string) {
  return useQuery({
    queryKey: ["calls", id],
    queryFn: () => getCall(id),
    enabled: !!id,
  });
}

export function useDeleteCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCall,
    onSuccess: (res) => {
      Toast.show({ type: "success", text1: res.message || "Call deleted" });
      qc.invalidateQueries({ queryKey: ["calls"] });
    },
    onError: (err) => {
      Toast.show({ type: "error", text1: err.message });
    },
  });
}
```

Key behaviors (replaces reference §4 "Key behaviors" table):

- **Auto re-fetch on filter change:** filters live in the `queryKey`. Change →
  new key → fetch. Old key's data stays cached (instant back-navigation).
- **Race conditions:** Query handles stale-response ordering. No `cancelled` flag.
- **Refetch after mutation:** `invalidateQueries({ queryKey: ["calls"] })`
  invalidates every list + detail under that resource. No `reloadToken`.
- **Loading split:** `isLoading` (first load, show skeleton) vs `isRefetching`
  (background refresh, show `RefreshControl` spinner) — comes free.
- **Errors:** queries expose `error`; render inline. Mutations toast in
  `onError` so callers don't need try/catch.

---

## 6. Lists — Infinite Scroll + Pull-to-Refresh

Mobile replaces numbered pagination with `FlatList`:

```tsx
// screens/CallsScreen.tsx (smart container — owns filter state)
import { useState, useMemo } from "react";
import { FlatList, RefreshControl } from "react-native";
import { useDebounce } from "@/hooks/useDebounce";
import { useCallList } from "@/hooks/useCalls";
import { CallRow } from "@/components/feature/CallRow";

export function CallsScreen() {
  const [searchInput, setSearchInput] = useState("");
  const [direction, setDirection] = useState<"all" | "incoming" | "outgoing" | "missed">("all");
  const debouncedSearch = useDebounce(searchInput, 500);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      direction: direction === "all" ? undefined : direction,
    }),
    [debouncedSearch, direction],
  );

  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, error } =
    useCallList(filters);

  const calls = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <FlatList
      data={calls}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => <CallRow call={item} />}
      onEndReached={() => hasNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      ListEmptyComponent={isLoading ? <CallListSkeleton /> : <EmptyState error={error} />}
    />
  );
}
```

Notes:

- **No "reset page to 1" logic needed.** Filter change → new `queryKey` → query
  starts at `initialPageParam: 1` automatically. (The web reference needed
  manual `setPage(1)` everywhere — gone.)
- Debounce rule unchanged: 500ms via shared `useDebounce`, only the settled
  value enters `filters`.
- Screen = smart container per `project_rules.md` §2: owns filter state, calls
  hooks, renders dumb components. `CallRow` is props-in/JSX-out.

---

## 7. Forms — Zod + react-hook-form (unchanged from reference)

```ts
// schema/autoReply.schema.ts
import { z } from "zod";

export const autoReplySchema = z.object({
  enabled: z.boolean(),
  message: z
    .string()
    .min(5, "Message too short")
    .max(160, "Keep within one SMS (160 chars)"),
});

export type AutoReplyFormValues = z.infer<typeof autoReplySchema>;
```

```ts
const form = useForm<AutoReplyFormValues>({
  resolver: zodResolver(autoReplySchema),
  defaultValues: { enabled: true, message: DEFAULT_AUTO_REPLY },
});
```

Submit handlers call the mutation hook; mutation handles toast + invalidation.

---

## 8. Device-Capture Uploads (mobile-only concern)

Capture flows (FileObserver → recording upload, SMS sync) run outside the
screen/hook layer — they fire from native-module events, possibly with the app
backgrounded. Rules:

- Capture services call the **API layer functions directly**
  (`uploadCallRecording`, `syncSmsBatch`) — never the React Query hooks (no
  React context in background tasks).
- After a background upload succeeds, invalidate from anywhere via the exported
  `queryClient`: `queryClient.invalidateQueries({ queryKey: ["calls"] })` — next
  foreground render shows fresh data.
- Queue + retry for offline capture (store pending uploads, drain on
  reconnect) is its own service under `services/` — out of scope for this doc.

---

## Summary Table

| Concern | Where It Lives |
|---|---|
| HTTP, auth header, 401 refresh | `services/api/client.ts` + `tokenStore.ts` (Keychain) |
| Endpoint functions | `services/api/<resource>.api.ts` — pure async, one per endpoint |
| Contract types (`Call`, `SmsTxn`, `Paginated<T>`) | `packages/shared` — never duplicated |
| Mobile-only types (params, UI state) | `src/types/<resource>.types.ts` |
| Data fetching, cache, refetch, mutations | `hooks/use<Resource>.ts` — React Query |
| Query client + online/focus wiring | `services/queryClient.ts` |
| Form validation | `schema/<form>.schema.ts` — Zod + react-hook-form |
| Search debounce (500ms) | `hooks/useDebounce.ts` |
| Filter state | Screen component `useState` — single source of truth |
| Lists | `FlatList` + `useInfiniteQuery` + `RefreshControl` |
| Toasts | `react-native-toast-message`, fired in mutation `onSuccess`/`onError` |
| Navigation | `navigation/RootNavigator.tsx` — React Navigation |
| Background capture uploads | `services/` modules calling API layer directly + `queryClient.invalidateQueries` |
