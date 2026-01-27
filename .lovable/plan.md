

# Delete Options Dropdown Feature

## Overview
Replace the current delete button behavior (which opens a single AlertDialog) with a dropdown menu that provides two options:
1. **Delete imported data** - Removes all guests from the event but keeps the event itself
2. **Delete event** - Deletes the entire event along with all its guests

## Implementation Steps

### Step 1: Add Delete All Guests Hook
Create a new mutation hook in `useGuests.tsx` to delete all guests for an event:

```typescript
export function useDeleteAllGuests() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('event_id', eventId);
      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['guests', eventId] });
    },
  });
}
```

### Step 2: Update EventDetail.tsx
Replace the AlertDialog with a DropdownMenu structure:

**New imports needed:**
- `DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem` from dropdown-menu
- `Users` icon is already imported
- Keep AlertDialog components for confirmation dialogs

**State management:**
Add state to control which confirmation dialog is open:
```typescript
const [deleteDialogType, setDeleteDialogType] = useState<'data' | 'event' | null>(null);
```

**UI structure:**
```text
+------------------+
|  [Trash Button]  |
+------------------+
         |
         v
+------------------------+
| Delete imported data   | <-- Opens confirmation for deleting guests only
+------------------------+
| Delete event           | <-- Opens confirmation for deleting entire event
+------------------------+
```

**New handler for deleting imported data:**
```typescript
const handleDeleteImportedData = async () => {
  if (!eventId) return;
  try {
    await deleteAllGuests.mutateAsync(eventId);
    toast({
      title: 'Data deleted',
      description: 'All imported guest data has been removed.',
    });
  } catch {
    toast({
      title: 'Error',
      description: 'Failed to delete data. Please try again.',
      variant: 'destructive',
    });
  }
};
```

### Step 3: Confirmation Dialogs
Each dropdown option will trigger a separate AlertDialog for confirmation:

**Delete Imported Data Dialog:**
- Title: "Delete Imported Data"
- Description: "This will permanently delete all {stats.total} guests from this event. The event itself will be kept. This action cannot be undone."
- Actions: Cancel | Delete Data

**Delete Event Dialog (existing):**
- Title: "Delete Event"
- Description: "This will permanently delete '{event.name}' and all {stats.total} guests. This action cannot be undone."
- Actions: Cancel | Delete Event

## Component Structure

```text
DropdownMenu
  DropdownMenuTrigger (Button with Trash2 icon)
  DropdownMenuContent
    DropdownMenuItem ("Delete imported data")
    DropdownMenuItem ("Delete event" - styled destructive)

AlertDialog (for delete data confirmation)
AlertDialog (for delete event confirmation)
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useGuests.tsx` | Add `useDeleteAllGuests` hook |
| `src/pages/EventDetail.tsx` | Replace AlertDialog with DropdownMenu + dual AlertDialogs |

## Visual Design
- Dropdown menu will appear aligned to the right edge of the trigger button
- Menu items will have appropriate icons (Users icon for "Delete imported data", Trash2 for "Delete event")
- "Delete event" option will be styled in destructive red color
- Both confirmation dialogs maintain the existing mobile-responsive design with full-width buttons on mobile

## Technical Notes
- The DropdownMenu component already has proper z-index (z-50) and background styling (bg-popover)
- RLS policies already allow authenticated users to delete guests for events they own
- The guest deletion query uses `event_id` filter which is properly indexed

