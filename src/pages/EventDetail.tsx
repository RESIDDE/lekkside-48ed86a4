import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Users, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ProgressRing } from '@/components/stats/ProgressRing';
import { GuestSearch } from '@/components/checkin/GuestSearch';
import { GuestCard } from '@/components/checkin/GuestCard';
import { ImportDialog } from '@/components/import/ImportDialog';
import { useEvent, useDeleteEvent } from '@/hooks/useEvents';
import { useGuests, useGuestStats, useCheckIn, useUndoCheckIn } from '@/hooks/useGuests';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredGuests = useMemo(() => {
    if (!guests) return [];
    
    let filtered = guests;
    
    // Filter by tab
    if (activeTab === 'pending') {
      filtered = filtered.filter(g => !g.checked_in);
    } else if (activeTab === 'checked-in') {
      filtered = filtered.filter(g => g.checked_in);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(guest => {
        const searchableFields = [
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
    
    return filtered;
  }, [guests, searchQuery, activeTab]);

  const handleCheckIn = async (guestId: string) => {
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
  };

  const handleUndoCheckIn = async (guestId: string) => {
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
  };

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
    }
  };

  if (eventLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground">Event not found</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/events')}>
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/events')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{event.name}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {event.date && (
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {format(new Date(event.date), 'PPP p')}
                  </span>
                )}
                {event.venue && (
                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {event.venue}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ImportDialog eventId={event.id} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Event</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{event.name}" and all {stats.total} guests. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteEvent}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ProgressRing percentage={stats.percentage} />
            
            <div className="flex-1 w-full">
              <div className="grid grid-cols-3 gap-4 text-center md:text-left">
                <div>
                  <p className="text-3xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Guests</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">{stats.checkedIn}</p>
                  <p className="text-sm text-muted-foreground">Checked In</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>

              {stats.ticketTypes && Object.keys(stats.ticketTypes).length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-2">By Ticket Type</p>
                  <div className="space-y-2">
                    {Object.entries(stats.ticketTypes).map(([type, data]) => (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-sm w-24 truncate">{type}</span>
                        <Progress 
                          value={data.total > 0 ? (data.checkedIn / data.total) * 100 : 0} 
                          className="flex-1 h-2" 
                        />
                        <span className="text-xs text-muted-foreground w-16 text-right">
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

        {/* Guest List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5" />
              Guest List
            </h2>
          </div>

          <GuestSearch value={searchQuery} onChange={setSearchQuery} />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="checked-in">Checked In ({stats.checkedIn})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {guestsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
              ) : filteredGuests.length > 0 ? (
                <div className="space-y-3">
                  {filteredGuests.map((guest) => (
                    <GuestCard
                      key={guest.id}
                      guest={guest}
                      onCheckIn={handleCheckIn}
                      onUndoCheckIn={handleUndoCheckIn}
                      isLoading={checkIn.isPending || undoCheckIn.isPending}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/50 rounded-xl">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  {searchQuery ? (
                    <>
                      <h3 className="text-lg font-medium text-foreground">No matching guests</h3>
                      <p className="text-muted-foreground mt-1">
                        Try a different search term
                      </p>
                    </>
                  ) : stats.total === 0 ? (
                    <>
                      <h3 className="text-lg font-medium text-foreground">No guests yet</h3>
                      <p className="text-muted-foreground mt-1 mb-4">
                        Import your guest list to start checking in
                      </p>
                      <ImportDialog eventId={event.id} />
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium text-foreground">
                        {activeTab === 'pending' ? 'All guests checked in!' : 'No checked-in guests yet'}
                      </h3>
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
