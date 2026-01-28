
# Fix Full Name Search Not Finding Guests

## Problem Identified
When users search for a guest using their full name (e.g., "Gift Abah"), the search returns "not found" even though the guest exists. This happens because:

1. The search checks each field **separately** - it looks for "Gift Abah" inside `first_name` ("Gift") and `last_name` ("Abah") individually
2. Since "Gift Abah" doesn't match "Gift" or "Abah" alone, no results are returned
3. The user would need to search for just "Gift" or just "Abah" to find the guest

## Solution
Modify the search logic to also match against the **combined full name** (`first_name + " " + last_name`), allowing users to search naturally using full names.

## Implementation

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/CheckInOnly.tsx` | Add full name combination to search filter |
| `src/pages/EventDetail.tsx` | Add full name combination to search filter |

### Code Changes

#### CheckInOnly.tsx (lines 38-47)

**Before:**
```typescript
if (searchQuery) {
  const query = searchQuery.toLowerCase();
  result = result.filter(
    (guest) =>
      guest.first_name?.toLowerCase().includes(query) ||
      guest.last_name?.toLowerCase().includes(query) ||
      guest.email?.toLowerCase().includes(query) ||
      guest.phone?.includes(query) ||
      guest.ticket_number?.toLowerCase().includes(query)
  );
}
```

**After:**
```typescript
if (searchQuery) {
  const query = searchQuery.toLowerCase().trim();
  result = result.filter((guest) => {
    // Combine first and last name for full name search
    const fullName = `${guest.first_name || ''} ${guest.last_name || ''}`.toLowerCase();
    
    return (
      fullName.includes(query) ||
      guest.first_name?.toLowerCase().includes(query) ||
      guest.last_name?.toLowerCase().includes(query) ||
      guest.email?.toLowerCase().includes(query) ||
      guest.phone?.includes(query) ||
      guest.ticket_number?.toLowerCase().includes(query)
    );
  });
}
```

#### EventDetail.tsx (lines 72-96)

Similar change to include full name matching:

**After:**
```typescript
if (searchQuery.trim()) {
  const query = searchQuery.toLowerCase().trim();
  filtered = filtered.filter(guest => {
    // Combine first and last name for full name search
    const fullName = `${guest.first_name || ''} ${guest.last_name || ''}`.toLowerCase();
    
    const searchableFields = [
      fullName,  // Add combined full name
      guest.first_name,
      guest.last_name,
      guest.email,
      guest.phone,
      guest.ticket_number,
      guest.ticket_type,
      guest.notes,
    ];
    
    // Also search custom fields
    if (guest.custom_fields) {
      const customFieldValues = Object.values(guest.custom_fields as Record<string, string>);
      searchableFields.push(...customFieldValues);
    }
    
    return searchableFields.some(field => 
      field?.toLowerCase().includes(query)
    );
  });
}
```

## How It Fixes The Issue

| Search Query | Before | After |
|--------------|--------|-------|
| "Gift" | Matches | Matches |
| "Abah" | Matches | Matches |
| "Gift Abah" | No results | Matches |
| "gift abah" | No results | Matches |
| "Abah Gift" | No results | No results (correct - order matters) |

## Additional Improvements Included

1. **Trim whitespace** - `query.trim()` prevents accidental spaces from breaking searches
2. **Handle null names** - Using `guest.first_name || ''` prevents errors when names are null
3. **Consistent logic** - Both pages will use the same improved search behavior

## Technical Notes

- The full name is constructed as `first_name + space + last_name` to match how users naturally type names
- The check `fullName.includes(query)` is placed first in the OR chain for clarity but order doesn't affect performance
- This is a client-side filter so there's no additional database load
- Works with partial matches (e.g., "Gift A" will still find "Gift Abah")
