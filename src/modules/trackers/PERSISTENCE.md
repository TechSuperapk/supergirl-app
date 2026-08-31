# Tracker persistence — how saving works

How every Goals/tracker feature stores data, and the pattern to follow when
adding a new one. Written from the code as it stands (Sleep, Water, Period,
Intimacy, BMI, Mood, Sickness, Measurement, Expense, Budgets).

---

## 1. The path a save takes

```
Screen  ──►  Hook            ──►  trackersDbService  ──►  dataApi
(form)       (useXTracker)        (collection names)      (local-first)
                │                                            │
                │ dispatch                                   ├─► AsyncStorage cache
                ▼                                            │   sb:<uid>:docs:<collection>
           Redux slice                                       │
       (instant UI update)                                   └─► mutation queue
                                                                 sb:<uid>:queue
                                                                      │
                                                              syncEngine (30s loop
                                                              + kickSync on write)
                                                                      │
                                                                      ▼
                                                        apiClient  ──►  POST/PATCH/DELETE
                                                        Bearer JWT      /api/data/:collection
                                                                             │
                                                                             ▼
                                                                        MongoDB
```

Every layer has one job:

| Layer | Responsibility |
|---|---|
| Screen | Collect input, validate, call the hook. Never touches storage. |
| Hook | Call the service, dispatch to Redux, expose derived state. |
| `trackersDbService` | Owns collection names and fetch windows. Nothing else. |
| `dataApi` | Local-first cache + queue, or straight to network. |
| `syncEngine` | Drains the queue, swaps temp ids for real ones. |
| `apiClient` | Attaches the JWT. |

---

## 2. Per-user separation

**Two independent mechanisms.** Both matter.

### On the server (authoritative)

`apiClient` attaches the session JWT as `Authorization: Bearer <token>`. The
backend derives `userId` from that token and scopes every query to it.

> The `userId` field written into document bodies is **for the client's
> convenience only**. It must never be what the server trusts. If any endpoint
> reads `req.body.userId` instead of the token's subject, that is a cross-user
> data hole — one user could read or write another's period, intimacy or
> medication records by changing an id. This is a server-repo concern and
> can't be enforced from the app.

### On the device (defence in depth)

The offline cache is namespaced by user id:

```
sb:<uid>:docs:trackers_period     ← cached documents, per collection
sb:<uid>:queue                    ← pending writes
```

A sync pass **pins itself to the uid it started with** (`runPass` in
`syncEngine.ts`), so an account switch mid-flush can't file user A's queued
writes into user B's bucket.

---

## 3. Local-first, and only for trackers

```ts
const LOCAL_FIRST = /^trackers_/;
```

Deliberately narrow. Auth, subscription and anything else goes straight to the
network, where a stale local copy would be a correctness problem rather than an
inconvenience.

For `trackers_*` collections:

- **Reads** return the cache immediately, then refresh in the background.
- **Writes** apply to the cache and enqueue. The UI updates instantly.
- **Offline** is the normal case, not an error path.

Documents created offline get a temp id (`local_…`). The sync engine swaps it
for the server id and rewrites any queued mutations that referenced it.

---

## 4. The five operations

```ts
listDocs<T>(collection, opts?)              // GET    /data/:collection
fetchDoc<T>(collection, id)                 // GET    /data/:collection/:id
createDoc<T>(collection, body)              // POST   /data/:collection
patchDoc<T>(collection, id, body)           // PATCH  /data/:collection/:id
removeDoc(collection, id)                   // DELETE /data/:collection/:id
upsertDoc<T>(collection, match, set)        // PUT    /data/:collection
```

### When to use `upsertDoc`

When the domain allows **one record per natural key**. Sleep is one entry per
night, mood one per date:

```ts
export async function saveSleepEntry(entry: Omit<SleepEntry, 'id' | 'createdAt'>) {
  return upsertDoc<SleepEntry>('trackers_sleep', { date: entry.date }, entry);
}
```

This is what stops a re-save creating a second record for the same night.

> **Pair it with an upsert reducer.** The server upserting on `date` is only
> half the job — if the Redux reducer does a plain `unshift`, the edited record
> appears twice locally until the next refresh. See `upsertSleepEntry` in
> `trackersSlice.ts`.

Use `createDoc` when several records per day are legitimate (water logs,
intimacy entries, expenses).

---

## 5. The pattern for a new tracker

Six files, in this order.

**1 — Type** (`types.ts`). New fields on an existing type go in **optional**, so
documents already in Mongo stay valid and no migration is needed.

```ts
export interface FooEntry {
  id: string;
  userId: string;
  date: string;          // YYYY-MM-DD, local calendar date
  // …
  createdAt: string;
  updatedAt?: string;
}
```

**2 — Service** (`trackersDbService.ts`). Collection name and fetch window only.

```ts
export async function fetchFooEntries(_userId: string, days = 365): Promise<FooEntry[]> {
  const since = sinceDate(days);
  const all = await listDocs<FooEntry>('trackers_foo');
  return all.filter(e => (e.date ?? '') >= since).sort(descBy('date'));
}
export async function saveFooEntry(e: Omit<FooEntry, 'id' | 'createdAt'>) {
  return createDoc<FooEntry>('trackers_foo', e);
}
export async function updateFooDoc(id: string, updates: Partial<FooEntry>) {
  await patchDoc('trackers_foo', id, updates);
}
export async function deleteFooById(id: string) {
  await removeDoc('trackers_foo', id);
}
```

The `_userId` argument is ignored — the backend scopes by JWT. It stays in the
signature so call sites read consistently.

**3 — Slice** (`trackersSlice.ts`): `setFoo`, `upsertFoo`, `deleteFoo`.

**4 — Hook** (`useTrackers.ts` or its own file):

```ts
export function useFooTracker() {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const entries = useSelector((s: RootState) => s.trackers.foo);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    dispatch(setFoo(await fetchFooEntries(user.id)));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true); setError(null);
    // Swallow into state — screens render regardless, so a slow API never
    // strands the user on a spinner.
    load()
      .catch(() => { if (!cancelled) setError('Could not load. Pull to refresh.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const logFoo = async (data: …) => {
    if (!user) return;
    const saved = await saveFooEntry({ userId: user.id, ...data });
    dispatch(upsertFoo(saved));      // optimistic; dataApi already cached it
    return saved;
  };

  return { entries, loading, refreshing, refresh, error, logFoo, /* … */ };
}
```

**5 — Analytics** (`utils/fooAnalytics.ts`). Pure, date-injectable, no React.
Everything derived — totals, streaks, percentages — lives here, never in
storage. See §6.

**6 — Tests** (`utils/__tests__/foo.test.js`), registered in `run.js`.

```
node src/modules/trackers/utils/__tests__/run.js
```

---

## 6. Derive, never store

**Store what the user entered. Compute everything else on read.**

A budget stores a limit and a period; *spent*, *remaining* and *whether to warn*
are computed from transactions. A sleep entry stores bedtime and wake time;
*average*, *streak* and *consistency* are computed from the entries.

A cached "spent" or "streak" field is a second copy of the truth, and it drifts
the moment a record is edited or deleted on another device. The only exception
is a value that is genuinely expensive **and** allowed to be stale — none of
the trackers have one.

Two rules that follow from this, both of which have caused real bugs here:

- **Local calendar dates.** `new Date().toISOString().split('T')[0]` converts to
  UTC first and moves the date across midnight. Use `toISO()` from the tracker's
  analytics module.
- **Nothing fabricated when empty.** No placeholder averages, no sample
  measurements, no default "Good". Return `null` and let the screen show an
  empty state.

---

## 7. Failure behaviour

| Situation | What happens |
|---|---|
| Offline write | Cached + queued. UI updates. Syncs when back. |
| Offline read, warm cache | Cache returned; background refresh fails silently. |
| Offline read, cold cache | Empty array. Screen shows its empty state. |
| Server 4xx on a queued write | **Mutation is dropped** and logged to console. The local copy stays. |
| Account switch mid-sync | Pass stays pinned to the original uid. |

> The 4xx-drop is a deliberate trade: one bad mutation would otherwise block
> every later write in the queue forever. But it means a rejected write is lost
> with only a console warning. If a tracker ever carries data where a silent
> loss is unacceptable, it needs a dead-letter path rather than a `console.warn`.

---

## 8. Two open items

**`clearLocalUserData` is never called.** It exists in `localStore.ts` but no
code path invokes it. On logout the previous user's cached tracker documents
stay on the device indefinitely.

The current behaviour is deliberate and documented — a logout with unsynced
entries shouldn't destroy them, and the cache is namespaced so it can't leak
into the next account in-app. But it means period, intimacy, medication and
measurement records sit in AsyncStorage on a shared or lost device. Worth an
explicit product decision:

- flush the queue on logout, then clear (loses nothing, clears the device), or
- clear only on explicit "sign out of this device", or
- leave as-is and document it.

**Server-side ownership needs verifying in `supergirl-server`.** Every
`/api/data/:collection` handler must derive the user from the JWT and scope the
query to it, and must reject a body-supplied `userId`. The client cannot
enforce this. Given what these collections hold, it's the highest-value check
in the whole feature.
