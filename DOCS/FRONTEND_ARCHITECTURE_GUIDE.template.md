# Frontend Architecture & Conventions Guide (Reusable Template)

> Project-agnostic frontend blueprint. Copy into any new project, swap the `<PLACEHOLDERS>`.
> Default stack: React 19 + TypeScript + Vite + TanStack Router + shadcn/ui + react-hook-form + Zod + native Fetch.
> AI-editor friendly: copy-paste blocks, real patterns, no project-specific coupling.

Core idea: **domain-based architecture**. Every feature is a self-contained vertical slice (`api / hooks / types / schema / components / pages / utils`). Shared infra (HTTP client, debounce, types, UI primitives) lives once at the root. No god components, no Redux/Context for feature-local state — plain React hooks.

---

## 1. Folder Structure

### Global (shared once — never duplicate per feature)

```
src/
├── services/api/client.ts     # apiFetch wrapper — single HTTP entry point
├── types/api.types.ts         # PaginatedResponse<T>, ItemResponse<T>, AsyncState<T>
├── hooks/useDebounce.ts       # shared 500ms debounce
├── guard/AuthGuard.tsx        # JWT route protection
├── components/ui/             # shadcn/ui primitives — NO domain logic
├── components/                # app-wide shells (AppShell, StatCard…)
├── routes/                    # TanStack file-based routes (thin wrappers)
├── lib/utils.ts               # cn() classname merge
└── store/                     # global UI state only (theme, sidebar) — Zustand ok here
```

### Per domain/feature

```
src/domains/<feature>/
├── api/
│   └── <entity>.api.ts        # pure async fns — one per endpoint
├── hooks/
│   ├── use<Entity>List.ts     # paginated list fetch
│   ├── use<Entity>Save.ts     # create/update mutation
│   ├── use<Entity>Delete.ts   # delete/deactivate mutation
│   ├── use<Entity>Stats.ts    # aggregates
│   └── use<Entity>Details.ts  # single item
├── types/
│   └── <feature>.types.ts     # entity, params, payloads, enums
├── schema/
│   ├── <entity>.schema.ts     # Zod schemas for forms
│   └── helpers.ts             # reusable Zod utils
├── components/
│   ├── <entity>/              # entity-specific UI (Table, Form, DetailsSheet)
│   └── shared/                # shared within THIS domain only
├── pages/
│   └── <Feature>Page.tsx      # composition layer — wires hooks + components
└── utils/
    ├── constants.ts           # PAGE_SIZE, status maps
    └── formatters.ts          # date/phone/coordinate display fns
```

### Naming conventions

| Item | Convention | Example |
|---|---|---|
| Domain folders | kebab-case | `user-management`, `billing` |
| API files | `<entity>.api.ts` | `users.api.ts` |
| Hook files | `use<Entity><Action>.ts` | `useUsersList.ts`, `useUserSave.ts` |
| Type files | `<feature>.types.ts` | `user.types.ts` |
| Schema files | `<entity>.schema.ts` | `user.schema.ts` |
| Page files | `<Feature>Page.tsx` | `UserManagementPage.tsx` |
| Component files | PascalCase | `UserTable.tsx` |
| Route files | `_app.<feature>.tsx` | `_app.user-management.tsx` |
| Constants/utils exports | camelCase / SCREAMING | `PAGE_SIZE`, `formatDate` |

---

## 2. HTTP Client (`services/api/client.ts`)

ONE fetch wrapper for the whole app. Handles base URL, auth token, JSON, errors. **Never recreate per feature.**

```ts
export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || "/api/v1"; // point at your backend / API gateway
}

function getAuthHeader() {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getErrorMessage(payload: unknown, status: number) {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload && typeof payload === "object" && "message" in payload) {
    const m = (payload as { message?: string | string[] }).message;
    if (Array.isArray(m)) return m.join(", ");        // backend validation arrays
    if (typeof m === "string" && m.trim()) return m;
  }
  return `Request failed with status ${status}`;
}

export async function apiFetch<TResponse>(path: string, opts: RequestInit = {}) {
  const headers = new Headers(opts.headers);

  // JSON content-type only when a non-FormData body is present
  const hasBody = opts.body !== undefined && opts.body !== null && String(opts.body) !== "";
  if (!(opts.body instanceof FormData) && hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Authorization")) {
    Object.entries(getAuthHeader()).forEach(([k, v]) => headers.set(k, v));
  }
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const response = await fetch(`${getApiBaseUrl()}${path}`, { credentials: "include", ...opts, headers });

  const ct = response.headers.get("content-type") || "";
  const payload = ct.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) throw new ApiError(getErrorMessage(payload, response.status), response.status, payload);
  return payload as TResponse;
}

export default apiFetch;
```

Key points: base URL from `VITE_API_BASE_URL` (falls back to `/api/v1`). Token auto-injected from `localStorage`. Non-ok → throws `ApiError` (status + parsed payload). Backend validation arrays flattened to a string.

---

## 3. Shared Response Types (`types/api.types.ts`)

Mirror your backend response envelope. Adjust field names to match the API contract.

```ts
export interface PaginationMeta {
  itemCount: number;
  pageCount: number;
  currentPage: number;
  hasNextPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
  message: string;
  status: "success" | "error";
  statusCode: number;
}

export interface ItemResponse<T> {
  data: T;
  message: string;
  status: "success" | "error";
  statusCode: number;
}

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
}
```

Keep `PaginationMeta` in sync with whatever your backend pagination helper returns.

---

## 4. API Layer (`domains/<feature>/api/<entity>.api.ts`)

Pure async functions. No React, no hooks, no state. Each has its own try/catch — **returns data on success, `false` on failure**. One function per endpoint.

### Query string helper (per api file that needs GET params)

```ts
function buildQueryString(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === "") return;   // strip empty/undefined
    sp.set(k, String(v));
  });
  const q = sp.toString();
  return q ? `?${q}` : "";
}
```

### CRUD set

```ts
import apiFetch from "@/services/api/client";
import type { PaginatedResponse, ItemResponse } from "@/types/api.types";
import type { User, UserDetails, UserListParams,
  CreateUserPayload, UpdateUserPayload } from "../types/user.types";

// GET list (paginated)
export async function listUsers(params: UserListParams = {}) {
  try {
    return await apiFetch<PaginatedResponse<User>>(
      `/users${buildQueryString({
        page: params.page, limit: params.limit, search: params.search, status: params.status,
      })}`,
    );
  } catch { return false; }
}

// GET single
export async function getUser(id: string) {
  try {
    return await apiFetch<ItemResponse<UserDetails>>(`/users/${id}`);
  } catch { return false; }
}

// POST
export async function createUser(body: CreateUserPayload) {
  try {
    return await apiFetch<ItemResponse<User>>("/users", {
      method: "POST", body: JSON.stringify(body),
    });
  } catch { return false; }
}

// PATCH
export async function updateUser(id: string, body: UpdateUserPayload) {
  try {
    return await apiFetch<ItemResponse<User>>(`/users/${id}`, {
      method: "PATCH", body: JSON.stringify(body),
    });
  } catch { return false; }
}

// DELETE
export async function deleteUser(id: string) {
  try {
    return await apiFetch<ItemResponse<null>>(`/users/${id}`, { method: "DELETE" });
  } catch { return false; }
}
```

**Rules:** type every param + response. GET → `buildQueryString`. POST/PATCH → `JSON.stringify`. Every fn try/catch → `false`. No token handling (client does it). No `toast` here. URLs relative to the base URL.

---

## 5. Types (`domains/<feature>/types/<feature>.types.ts`)

```ts
export type UserStatus = "active" | "suspended" | "pending" | "rejected";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;          // nullable = `| null`, NOT optional
  status: UserStatus;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserDetails extends User {
  activityHistory: ActivityEntry[];
  organization: { id: string; name: string } | null;
}

export interface UserListParams {
  page?: number; limit?: number; search?: string; status?: UserStatus;
}

export interface CreateUserPayload {
  fullName: string; email: string; phone?: string;
  roles: string[]; organizationId: string;
}
export interface UpdateUserPayload extends Partial<CreateUserPayload> {}
```

**Rules:** entity interfaces match backend response exactly (camelCase). Status = union types, **not** TS `enum`. Nullable → `| null`, optional input → `?`. Mutation payloads are separate types, not reused entity interfaces. `ListParams` covers all query params.

---

## 6. Custom Hooks (`domains/<feature>/hooks/`)

One hook = one responsibility. One fetch = one hook. One mutation = one hook. Pattern: `useState` + `useCallback` + `useEffect`. **No `react-query` needed** for this style (though it's a valid alternative — pick one and stay consistent).

### 6.1 List hook (GET)

```ts
import { useCallback, useEffect, useState } from "react";
import { listUsers } from "../api/user.api";
import type { User, UserStatus } from "../types/user.types";
import type { PaginationMeta } from "@/types/api.types";

const PAGE_SIZE = 20;

export default function useUsersList(
  page: number,
  debouncedSearch: string,
  statusFilter: UserStatus | "all",
  setPage: (p: number) => void,
) {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const result = await listUsers({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: statusFilter === "all" ? undefined : statusFilter, // "all" → omit param
    });
    if (result) {
      setUsers(result.data);
      setPagination(result.pagination);
      // snap back if current page overran after a delete/filter
      if (result.data.length === 0 && page > 1 && result.pagination.pageCount < page) {
        setPage(result.pagination.pageCount);
      }
    }
    setIsLoading(false);
  }, [page, debouncedSearch, statusFilter, setPage]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return { users, pagination, isLoading, fetchUsers };
}
```

**How auto-refetch works:** every dynamic param is in the `useCallback` deps → param change makes a new `fetchUsers` ref → `useEffect([fetchUsers])` fires → exactly one API call. No change → referential equality blocks re-runs. No `isMounted`/`cancelled` flags, no `reloadToken` counters.

### 6.2 Mutation hook (POST/PATCH/DELETE)

```ts
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createUser, updateUser } from "../api/user.api";
import type { User, CreateUserPayload, UpdateUserPayload } from "../types/user.types";

export default function useUserSave(refetch: () => void) {
  const [editing, setEditing] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const openForm = useCallback((u?: User) => { setEditing(u || null); setFormOpen(true); }, []);
  const closeForm = useCallback(() => { setFormOpen(false); setEditing(null); }, []);

  const handleSave = useCallback(
    async (values: CreateUserPayload | UpdateUserPayload) => {
      setIsSaving(true);
      const result = editing
        ? await updateUser(editing.id, values as UpdateUserPayload)
        : await createUser(values as CreateUserPayload);
      if (result) { toast.success(result.message); closeForm(); refetch(); }
      else { toast.error("Unable to save user."); }
      setIsSaving(false);
    },
    [editing, closeForm, refetch],
  );

  return { formOpen, setFormOpen, editing, openForm, closeForm, isSaving, handleSave };
}
```

### 6.3 Composition (in the page)

```ts
const { users, pagination, isLoading, fetchUsers } = useUsersList(page, debouncedSearch, statusFilter, setPage);
const { stats, fetchStats } = useUserStats();

const refetch = useCallback(() => { fetchUsers(); fetchStats(); }, [fetchUsers, fetchStats]);

const { handleSave, isSaving, formOpen, openForm, closeForm } = useUserSave(refetch);
```

### Conditional fetch (guard inside callback)

```ts
const fetchDetails = useCallback(async () => {
  if (!userId) { setDetails(null); setIsLoading(false); return; }
  setIsLoading(true);
  const result = await getUser(userId);
  if (result) setDetails(result.data);
  setIsLoading(false);
}, [userId]);
useEffect(() => { fetchDetails(); }, [fetchDetails]);
```

### Indexed state (children keyed by parent id)

```ts
const [childrenByParent, setChildrenByParent] = useState<Record<string, Child[]>>({});
const fetchChildren = useCallback(async () => {
  if (parentIds.length === 0) { setChildrenByParent({}); return; }
  const results = await Promise.all(parentIds.map(async (id) => {
    const r = await listChildren({ parentId: id });
    return { id, data: r ? r.data : [] };
  }));
  setChildrenByParent(Object.fromEntries(results.map((e) => [e.id, e.data])));
}, [parentIds]);
useEffect(() => { fetchChildren(); }, [fetchChildren]);
```

---

## 7. Debounce & Search (`hooks/useDebounce.ts`)

Shared hook, **500ms standard delay**.

```ts
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}
```

Usage:

```ts
const [searchInput, setSearchInput] = useState("");
const debouncedSearch = useDebounce(searchInput, 500);
// pass debouncedSearch (not searchInput) to the list hook
```

**Flow:** keystroke updates `searchInput` instantly (responsive UI) → debounce waits 500ms idle → updates `debouncedSearch` → list hook dep changes → single API call. Same for any text filter.

### Always reset to page 1 on filter change

```tsx
<Input value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1); }} />
```

Or, for multiple filters together:

```ts
useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);
```

---

## 8. Filter & Pagination State

The **page component is the single source of truth** for filter state. Hooks never own filters.

```tsx
export function UserManagementPage() {
  // filter state — single source of truth
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchInput, 500);

  const { users, pagination, isLoading, fetchUsers } =
    useUsersList(page, debouncedSearch, statusFilter, setPage);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Input placeholder="Search users..." value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); setPage(1); }} />
        <Select value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as UserStatus | "all"); setPage(1); }}>
          {/* all | active | suspended | pending | rejected */}
        </Select>
      </div>

      <UserTable data={users} isLoading={isLoading} onEdit={openForm} />

      <Pagination currentPage={page} pageCount={pagination?.pageCount ?? 1} onPageChange={setPage} />
    </div>
  );
}
```

### Data flow

```
User input → page filter state (useState)
          → useDebounce (search, 500ms)
          → list hook (useCallback deps = [page, debouncedSearch, statusFilter])
          → api fn (apiFetch → backend)
          → hook setState → page re-renders
```

---

## 9. Route Files (`routes/_app.<feature>.tsx`)

Thin wrappers. Import the page, set metadata. **No hooks, state, or API calls.**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { UserManagementPage } from "@/domains/user-management/pages/UserManagementPage";

export const Route = createFileRoute("/_app/user-management")({
  component: UserManagementPage,
  head: () => ({ meta: [{ title: "User Management | <App>" }] }),
});
```

Protected routes nest under the `_app` layout, which wraps with `AuthGuard` (checks JWT in `localStorage`, redirects to login if absent).

---

## 10. Form Validation (`schema/<entity>.schema.ts`)

Zod schemas + react-hook-form `zodResolver`. **Never inline schemas in components.**

```ts
import { z } from "zod";
import { optionalString } from "./helpers";

export const createUserSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: optionalString,
  roles: z.array(z.string()).min(1, "At least one role required"),
  organizationId: z.string().uuid("Select an organization"),
});
export type CreateUserFormValues = z.infer<typeof createUserSchema>;
```

Reusable helpers (`schema/helpers.ts`):

```ts
import { z } from "zod";
export const optionalString = z.string().optional().or(z.literal(""));
export const optionalNumber = z.coerce.number().optional().or(z.literal(0));
```

Form component:

```tsx
const form = useForm<CreateUserFormValues>({
  resolver: zodResolver(createUserSchema),
  defaultValues: { fullName: "", email: "", roles: [], organizationId: "" },
});

const onSubmit = async (values: CreateUserFormValues) => {
  await handleSave(values);   // mutation hook shows toast + refetch
  form.reset();
};
```

---

## 11. Component Line-Count Rules

Keep components small and focused.

| Limit | Lines | Action |
|---|---|---|
| **Soft** | ≤ 250 | Target. Pages and components should sit here. |
| **Hard** | ≤ 400 | Exceeding = must split before merge. |

When a component grows past the soft limit, extract:
- **Data/logic** → a domain hook (`hooks/`).
- **Sub-UI** → entity or `shared/` components (`Table`, `Form`, `DetailsSheet`, `StatusBadge`, `EmptyState`).
- **Constants/format fns** → `utils/constants.ts` / `utils/formatters.ts`.
- **Validation** → `schema/`.

> Rule of thumb: if a file has both data-fetching `useEffect`s **and** heavy JSX **and** inline formatters, it's doing 3 jobs — split it. Shared pieces should stay tiny (`StatusBadge` ~13 lines, `DetailItem` ~22, `EmptyState` ~26).

---

## 12. New-Feature Checklist

- [ ] Create `src/domains/<feature>/` with `api / hooks / types / schema / components / pages / utils`.
- [ ] Types first: entity interface, `ListParams`, mutation payloads, status unions.
- [ ] API file: one async fn per endpoint, `buildQueryString` for GET, try/catch → `false`.
- [ ] List hook (`useState`+`useCallback`+`useEffect`), mutation hook(s) with toast + `refetch`.
- [ ] Page component owns filter/pagination state; wire `useDebounce(search, 500)`; reset page on filter change.
- [ ] Zod schema in `schema/`; form uses `zodResolver`.
- [ ] Thin route file `_app.<feature>.tsx` under the auth-guarded layout.
- [ ] Keep every component ≤ 250 lines (hard ≤ 400) — extract hooks/sub-components.
- [ ] Domain UI in `components/`; only shadcn primitives in `components/ui/`.
- [ ] `tsc --noEmit` clean before merge.

---

## 13. Anti-Patterns (DON'T)

- ❌ Domain logic in `components/ui/` — those are shadcn primitives only.
- ❌ API function without try/catch — every one must catch and return `false`.
- ❌ Redux/Zustand/Context for feature-local state — React hooks suffice (Zustand only for global UI like theme).
- ❌ New fetch/axios instance per feature — use shared `apiFetch`.
- ❌ Inline types in components — put in `types/`. Inline Zod schemas — put in `schema/`.
- ❌ TS `enum` — use union string types.
- ❌ Filter state inside hooks — the page owns it.
- ❌ Raw `.then()/.catch()` in hooks — use `useCallback`+`useEffect`.
- ❌ `isMounted`/`cancelled` flags or `reloadToken` counters — the callback-ref pattern handles it; call `refetch()` after mutations.
- ❌ Business logic in route files — thin wrappers only.
- ❌ Hardcoded URLs — base URL lives in the client.
- ❌ `toast` inside API functions — call it in hooks/pages.
- ❌ God components — split at 250 lines.

## DO

- ✅ One reference domain as canonical — copy its shape for new features.
- ✅ Sonner `toast` for all mutation feedback, in the hook layer.
- ✅ `useCallback` fetch fns with all dynamic params as deps; `useEffect([fetchFn])` to auto-fetch.
- ✅ Check `if (result)` (API returns `false` on error); expose `refetch` from hooks.
- ✅ `buildQueryString()` to drop empty/undefined GET params; `"all"` filter → `undefined`.
- ✅ Reset page to 1 on search/filter change.

---

## Tech Stack Reference

| Tech | Purpose |
|---|---|
| React 19 + TypeScript 5.8 | UI + types |
| Vite | bundler/dev server |
| TanStack Router | file-based routing |
| shadcn/ui (Radix) + Tailwind | UI primitives + styling |
| react-hook-form + Zod | forms + validation |
| Sonner | toasts |
| Native Fetch (via `apiFetch`) | HTTP |
| Recharts / lucide-react | charts / icons |

> Optional: **TanStack Query** is a valid swap for the manual `useState`+`useEffect` data hooks (caching, dedup, background refetch out of the box). If adopted, do it app-wide — don't mix both styles.

---

## How To Reuse This Template

1. Copy this file into the new project's `docs/`.
2. Global swaps: `User` → your first entity, `user-management` → your domain, `VITE_API_BASE_URL` → your API.
3. Drop §3 fields to match your backend's response envelope.
4. Scaffold the first domain from §12; treat it as the canonical reference for the rest.
