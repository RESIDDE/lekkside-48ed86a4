import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import Fuse from 'fuse.js';
import { ArrowLeft, Calendar, MapPin, Users, Trash2, FileX } from 'lucide-react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ProgressRing } from '@/components/stats/ProgressRing';
import { GuestSearch } from '@/components/checkin/GuestSearch';
import { GuestCard } from '@/components/checkin/GuestCard';
import { ImportDialog } from '@/components/import/ImportDialog';
import { ExportButton } from '@/components/export/ExportButton';
import { CheckInStationsDialog } from '@/components/share/CheckInStationsDialog';
import { StationsStatsPanel } from '@/components/share/StationsStatsPanel';
import { FormsButton } from '@/components/forms/FormsButton';
import { useEvent, useDeleteEvent } from '@/hooks/useEvents';
import { useGuests, useGuestStats, useCheckIn, useUndoCheckIn, useDeleteAllGuests } from '@/hooks/useGuests';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: guests, isLoading: guestsLoading } = useGuests(eventId);
  const stats = useGuestStats(eventId);
  
  const checkIn = useCheckIn();
  const undoCheckIn = useUndoCheckIn();
  const deleteEvent = useDeleteEvent();
  const deleteAllGuests = useDeleteAllGuests();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [deleteDialogType, setDeleteDialogType] = useState<'data' | 'event' | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Prepare guests with full name for fuzzy search
  const guestsWithFullName = useMemo(() => {
    if (!guests) return [];
    return guests.map(guest => {
      // Collect custom field values for search
      const customFieldValues = guest.custom_fields 
        ? Object.values(guest.custom_fields as Record<string, string>).join(' ')
        : '';
      
      return {
        ...guest,
        fullName: `${guest.first_name || ''} ${guest.last_name || ''}`.trim(),
        reverseName: `${guest.last_name || ''} ${guest.first_name || ''}`.trim(),
        searchableCustomFields: customFieldValues,
      };
    });
  }, [guests]);

  // Create Fuse instance for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(guestsWithFullName, {
      keys: [
        { name: 'fullName', weight: 2 },
        { name: 'reverseName', weight: 2 },
        { name: 'first_name', weight: 1.5 },
        { name: 'last_name', weight: 1.5 },
        { name: 'email', weight: 1 },
        { name: 'phone', weight: 1 },
        { name: 'ticket_number', weight: 1 },
        { name: 'ticket_type', weight: 0.8 },
        { name: 'notes', weight: 0.5 },
        { name: 'searchableCustomFields', weight: 0.8 },
      ],
      threshold: 0.4, // 0 = exact match, 1 = match anything
      distance: 100,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [guestsWithFullName]);

  const filteredGuests = useMemo(() => {
    let filtered = guestsWithFullName;
    
    // Filter by tab first
    if (activeTab === 'pending') {
      filtered = filtered.filter(g => !g.checked_in);
    } else if (activeTab === 'checked-in') {
      filtered = filtered.filter(g => g.checked_in);
    }
    
    // Then apply fuzzy search
    if (searchQuery.trim()) {
      const tabFilteredFuse = new Fuse(filtered, {
        keys: [
          { name: 'fullName', weight: 2 },
          { name: 'reverseName', weight: 2 },
          { name: 'first_name', weight: 1.5 },
          { name: 'last_name', weight: 1.5 },
          { name: 'email', weight: 1 },
          { name: 'phone', weight: 1 },
          { name: 'ticket_number', weight: 1 },
          { name: 'ticket_type', weight: 0.8 },
          { name: 'notes', weight: 0.5 },
          { name: 'searchableCustomFields', weight: 0.8 },
        ],
        threshold: 0.4,
        distance: 100,
        includeScore: true,
        minMatchCharLength: 2,
      });
      const searchResults = tabFilteredFuse.search(searchQuery.trim());
      filtered = searchResults.map(r => r.item);
    }
    
    return filtered;
  }, [guestsWithFullName, searchQuery, activeTab]);

  const handleCheckIn = useCallback(async (guestId: string) => {
    if (!user) return;
    
    try {
      await checkIn.mutateAsync({ guestId, userId: user.id });
      toast({
        title: 'Checked in!',
        description: 'Guest has been successfully checked in.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to check in guest. Please try again.',
        variant: 'destructive',
      });
    }
  }, [user, checkIn, toast]);

  const handleUndoCheckIn = useCallback(async (guestId: string) => {
    try {
      await undoCheckIn.mutateAsync(guestId);
      toast({
        title: 'Check-in undone',
        description: 'Guest check-in has been reversed.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to undo check-in. Please try again.',
        variant: 'destructive',
      });
    }
  }, [undoCheckIn, toast]);

  const handleDeleteEvent = async () => {
    if (!eventId) return;
    
    try {
      await deleteEvent.mutateAsync(eventId);
      toast({
        title: 'Event deleted',
        description: 'The event and all its guests have been deleted.',
      });
      navigate('/events');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogType(null);
    }
  };

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
    } finally {
      setDeleteDialogType(null);
    }
  };

  if (eventLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Event not found</h2>
          <p className="text-muted-foreground mt-1">This event may have been deleted.</p>
          <Button variant="outline" className="mt-6" onClick={() => navigate('/events')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/events')}
              className="h-10 w-10 flex-shrink-0 -ml-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">{event.name}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                {event.date && (
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5 flex-shrink-0" />
                    {format(new Date(event.date), 'PPP p')}
                  </span>
                )}
                {event.venue && (
                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
                    <span className="truncate">{event.venue}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons - full width on mobile */}
          <div className="flex flex-wrap gap-2">
            <ImportDialog eventId={event.id} />
            <ExportButton guests={guests || []} eventName={event.name} />
            <CheckInStationsDialog eventId={event.id} />
            <FormsButton eventId={event.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive h-10 w-10 ml-auto">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => setDeleteDialogType('data')}
                  disabled={stats.total === 0}
                >
                  <FileX className="w-4 h-4 mr-2" />
                  Delete imported data
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setDeleteDialogType('event')}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete Imported Data Dialog */}
            <AlertDialog open={deleteDialogType === 'data'} onOpenChange={(open) => !open && setDeleteDialogType(null)}>
              <AlertDialogContent className="mx-4 max-w-[calc(100%-2rem)] sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Imported Data</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {stats.total} guests from this event. The event itself will be kept. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteImportedData}
                    className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Delete Event Dialog */}
            <AlertDialog open={deleteDialogType === 'event'} onOpenChange={(open) => !open && setDeleteDialogType(null)}>
              <AlertDialogContent className="mx-4 max-w-[calc(100%-2rem)] sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Event</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{event.name}" and all {stats.total} guests. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteEvent}
                    className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Event
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <ProgressRing percentage={stats.percentage} size={140} strokeWidth={10} />
            </div>
            
            <div className="flex-1 w-full">
              <div className="grid grid-cols-3 gap-3 sm:gap-6">
                <div className="text-center lg:text-left bg-muted/50 rounded-xl p-3 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Total</p>
                </div>
                <div className="text-center lg:text-left bg-[hsl(var(--success))]/10 rounded-xl p-3 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-[hsl(var(--success))]">{stats.checkedIn}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Checked In</p>
                </div>
                <div className="text-center lg:text-left bg-[hsl(var(--warning))]/10 rounded-xl p-3 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-[hsl(var(--warning))]">{stats.pending}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Pending</p>
                </div>
              </div>

              {stats.ticketTypes && Object.keys(stats.ticketTypes).length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-3">By Ticket Type</p>
                  <div className="space-y-2.5">
                    {Object.entries(stats.ticketTypes).map(([type, data]) => (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-sm w-20 sm:w-28 truncate font-medium">{type}</span>
                        <Progress 
                          value={data.total > 0 ? (data.checkedIn / data.total) * 100 : 0} 
                          className="flex-1 h-2.5" 
                        />
                        <span className="text-xs text-muted-foreground w-14 text-right font-medium">
                          {data.checkedIn}/{data.total}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Station Stats */}
        <StationsStatsPanel eventId={event.id} />

        {/* Guest List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Guest List</h2>
          </div>

          <GuestSearch value={searchQuery} onChange={setSearchQuery} />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-12">
              <TabsTrigger value="all" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                All ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm data-[state=active]:bg-[hsl(var(--warning))] data-[state=active]:text-[hsl(var(--warning-foreground))]">
                Pending ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="checked-in" className="text-xs sm:text-sm data-[state=active]:bg-[hsl(var(--success))] data-[state=active]:text-[hsl(var(--success-foreground))]">
                Done ({stats.checkedIn})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {guestsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 rounded-2xl" />
                  ))}
                </div>
              ) : filteredGuests.length > 0 ? (
                <div className="space-y-3">
                  {filteredGuests.slice(0, 50).map((guest) => (
                    <GuestCard
                      key={guest.id}
                      guest={guest}
                      onCheckIn={handleCheckIn}
                      onUndoCheckIn={handleUndoCheckIn}
                      isLoading={checkIn.isPending || undoCheckIn.isPending}
                    />
                  ))}
                  {filteredGuests.length > 50 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Showing 50 of {filteredGuests.length} guests. Use search to find specific guests.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 sm:py-16 bg-muted/30 rounded-2xl border-2 border-dashed border-border">
                  <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-7 h-7 text-muted-foreground" />
                  </div>
                  {searchQuery ? (
                    <>
                      <h3 className="text-lg font-semibold text-foreground">No matching guests</h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Try a different search term
                      </p>
                    </>
                  ) : stats.total === 0 ? (
                    <>
                      <h3 className="text-lg font-semibold text-foreground">No guests yet</h3>
                      <p className="text-muted-foreground mt-1 mb-5 text-sm">
                        Import your guest list to start checking in
                      </p>
                      <ImportDialog eventId={event.id} />
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-foreground">
                        {activeTab === 'pending' ? 'All guests checked in! 🎉' : 'No checked-in guests yet'}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {activeTab === 'pending' ? 'Great job!' : 'Start checking in guests from the list'}
                      </p>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
