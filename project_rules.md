# Yes Boss — Project Rules & Conventions

Engineering standards for the Yes Boss monorepo. Keep code reusable, components
small and single-purpose, and types shared across mobile and backend.

---

## 1. Component Size Standard

Line caps are **guidelines + lint warnings**, not hard gates. The real rule is
**one component = one responsibility**; lines follow from that.

| Tier | Lines | Notes |
|---|---|---|
| Small | 50–100 | Most leaf/presentational components. |
| Medium | 100–200 | Composite components. |
| Large | 200–300 | Ceiling. |

**Hard stop at 300 lines** — past that, split the component.

A component under the line cap can still do too much. Line count is a symptom;
single-responsibility is the cause.

---

## 2. Reusability Rules (the real reuse levers)

1. **Separate logic from view.** Put state, effects, and data-fetching in a
   custom hook (e.g. `useCallList`); keep the component render-only. The hook is
   reusable, the component stays dumb.
2. **Dumb vs smart components.**
   - *Dumb (presentational):* props in, JSX out. No API calls. Maximally reusable.
   - *Smart (container):* wires data to dumb components. Not reused — that's fine.
3. **`common/` components take zero feature knowledge.** If it lives in
   `components/common/`, it must work in any feature.
4. **One component export per file.** File name = component name.

---

## 3. Complexity Limits

Count complexity, not just lines:

- Max **~7 props** per component. More → group into an object or split.
- Max **~3 levels** of JSX nesting.
- More than **3 `useState`** in one component → use `useReducer` or extract a hook.

---

## 4. Folder Structure

```
src/
  components/
    common/      # reused everywhere (Button, Card, Avatar)
    feature/     # feature-specific (CallRow, SmsTxnCard)
  hooks/         # logic, data-fetching
  screens/       # smart container screens
  services/      # API clients
  types/         # local types (shared types live in packages/shared)
  utils/
```

---

## 5. Types & API Contracts

- All cross-boundary types (`Call`, `SmsTxn`, API request/response shapes) live in
  **`packages/shared`** — one source of truth for mobile + backend.
- Never duplicate a contract type. Change it once; both sides get compile errors
  on mismatch.

---

## 6. TypeScript

- `strict: true` everywhere.
- No `any` — use `unknown` + narrowing if a type is genuinely unknown.
- Prefer `type` for unions/contracts, `interface` for extendable object shapes.

---

## 7. Naming

- Components / files: `PascalCase` (`CallRow.tsx`).
- Hooks: `useCamelCase` (`useCallList.ts`).
- Variables / functions: `camelCase`.
- Constants: `UPPER_SNAKE_CASE`.
- Booleans read as predicates: `isLoading`, `hasError`, `canSend`.

---

## 8. Lint Enforcement

ESLint with warnings (guideline pressure, not blockers):

```json
{
  "rules": {
    "max-lines": ["warn", 300],
    "max-lines-per-function": ["warn", 250],
    "complexity": ["warn", 15],
    "max-depth": ["warn", 3],
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

---

## 9. Git

- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- Small, focused commits. One concern per commit.
- Branch per feature: `feat/sms-analytics`, `feat/call-backup`.

---

## 10. API Pagination

Every paginated API response uses this exact envelope. Offset-based. Same shape
on every endpoint.

```ts
// packages/shared
interface Paginated<T> {
  data: T[];
  pagination: {
    itemCount: number;    // total rows matching the query (COUNT)
    pageCount: number;    // total pages = ceil(itemCount / limit)
    currentPage: number;  // page client is on now
    hasNextPage: boolean; // currentPage < pageCount
  };
}
```

Backend builds it as:

```ts
const pageCount = Math.ceil(total / limit);
return {
  data,
  pagination: {
    itemCount: total,
    pageCount,
    currentPage: page,
    hasNextPage: page < pageCount,
  },
};
```

- Key is `pagination` (not `meta`). Use it on **every** list endpoint.
- `Paginated<T>` lives in `packages/shared` — mobile + backend share it.

---

## 11. Security

- Lock the backend API with auth even though it's single-user — recordings and
  SMS data are private.
- No secrets in the repo. Use `.env` (gitignored) + an `.env.example`.
- Validate all API input on the backend (don't trust the client).
