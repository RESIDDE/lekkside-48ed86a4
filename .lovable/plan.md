

# Performance Optimization Plan: Make the Platform Lightning Fast

## Overview
This plan addresses performance bottlenecks across the application to ensure fast initial load times, responsive interactions, and smooth user experience even with large guest lists (up to 10,000 guests).

---

## Key Performance Issues Identified

| Issue | Impact | Location |
|-------|--------|----------|
| No code splitting | Large initial bundle loads everything upfront | `App.tsx` |
| All pages loaded eagerly | Slow first contentful paint | All route imports |
| No React Query caching optimization | Redundant API calls | `useEvents.tsx`, `useGuests.tsx` |
| GuestCard not memoized | Re-renders entire list on any change | `GuestCard.tsx` |
| No list virtualization | Poor performance with 10,000 guests | `EventDetail.tsx`, `CheckInOnly.tsx` |
| EventCard fetches stats for each card | N+1 query pattern on Dashboard | `EventCard.tsx` |
| No skeleton/placeholder optimization | Perceived slowness during load | Various pages |

---

## Implementation Steps

### Step 1: Add Code Splitting with React.lazy

Convert page imports in `App.tsx` to use lazy loading so only the current route loads initially:

```typescript
// Before: Eager loading
import Dashboard from "./pages/Dashboard";

// After: Lazy loading with Suspense
const Dashboard = lazy(() => import("./pages/Dashboard"));
```

All routes except `Index` (which is tiny) will be lazy-loaded:
- `Auth`, `Dashboard`, `Events`, `EventDetail`, `CheckInOnly`, `PublicForm`, `Profile`, `NotFound`

Add a `Suspense` boundary with a lightweight loading spinner.

### Step 2: Optimize React Query Configuration

Update the QueryClient configuration in `App.tsx` for better caching:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - reduce refetches
      gcTime: 1000 * 60 * 30,   // 30 minutes cache
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      retry: 1, // Reduce retry attempts
    },
  },
});
```

### Step 3: Memoize GuestCard Component

Wrap `GuestCard` with `React.memo` to prevent unnecessary re-renders when other guests in the list change:

```typescript
export const GuestCard = memo(function GuestCard({ 
  guest, 
  onCheckIn, 
  onUndoCheckIn, 
  isLoading 
}: GuestCardProps) {
  // ... existing implementation
});
```

### Step 4: Add List Virtualization for Large Guest Lists

Install `@tanstack/react-virtual` and implement virtual scrolling for guest lists in `EventDetail.tsx` and `CheckInOnly.tsx`:

- Only render visible guests (typically 10-20 at a time)
- Dramatically improves performance with 10,000+ guests
- Maintains smooth scrolling experience

### Step 5: Fix N+1 Query in EventCard

Currently, each `EventCard` on the Dashboard calls `useGuestStats(event.id)` which triggers separate queries. Optimize by:

1. Create a batch query hook `useEventsWithStats()` that joins events with guest counts in a single query
2. Or preload stats for visible events using React Query's `prefetchQuery`

### Step 6: Optimize Auth State Initialization

The current auth flow makes two sequential calls. Optimize in `useAuth.tsx`:

```typescript
useEffect(() => {
  // Get initial session first
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  });

  // Then subscribe for future changes (non-blocking)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

### Step 7: Add Search Debouncing

Add debounced search in `GuestSearch.tsx` to prevent filtering on every keystroke:

```typescript
const [debouncedValue, setDebouncedValue] = useState(value);

useEffect(() => {
  const timer = setTimeout(() => onChange(debouncedValue), 200);
  return () => clearTimeout(timer);
}, [debouncedValue]);
```

### Step 8: Memoize Callback Functions

In `EventDetail.tsx` and `CheckInOnly.tsx`, wrap handlers with `useCallback`:

```typescript
const handleCheckIn = useCallback(async (guestId: string) => {
  // ... existing logic
}, [user, checkIn, toast]);

const handleUndoCheckIn = useCallback(async (guestId: string) => {
  // ... existing logic  
}, [undoCheckIn, toast]);
```

### Step 9: Optimize Guest Stats Calculation

Memoize the stats calculation in `useGuestStats` to prevent recalculation on every render:

```typescript
return useMemo(() => ({
  total,
  checkedIn,
  pending,
  percentage,
  ticketTypes,
}), [guests]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add lazy loading, Suspense, optimize QueryClient |
| `src/hooks/useAuth.tsx` | Optimize auth initialization order |
| `src/hooks/useGuests.tsx` | Memoize stats calculation |
| `src/components/checkin/GuestCard.tsx` | Wrap with React.memo |
| `src/components/checkin/GuestSearch.tsx` | Add debounced input |
| `src/pages/EventDetail.tsx` | Add useCallback, virtual list |
| `src/pages/CheckInOnly.tsx` | Add useCallback, virtual list |
| `package.json` | Add `@tanstack/react-virtual` dependency |

---

## Expected Performance Improvements

| Metric | Before | After |
|--------|--------|-------|
| Initial Bundle Size | ~500KB (all pages) | ~150KB (only needed page) |
| Time to Interactive | ~3-4s | ~1-2s |
| Guest List Render (10K) | Freezes browser | Smooth 60fps scrolling |
| Search Response | Laggy on large lists | Instant with debounce |
| Dashboard Load | Multiple API calls | Optimized batch fetch |

---

## Technical Notes

- React.lazy with Suspense is the standard React 18 approach for code splitting
- TanStack Virtual (formerly react-virtual) is the most efficient virtualization library
- The 200ms debounce for search is the sweet spot between responsiveness and performance
- React.memo on GuestCard prevents re-renders when sibling guests change (critical for lists)
- Query caching with 5-minute staleTime prevents unnecessary refetches while keeping data reasonably fresh

