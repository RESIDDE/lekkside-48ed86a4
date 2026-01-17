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
import { ExportButton } from '@/components/export/ExportButton';
import { ShareCheckInButton } from '@/components/share/ShareCheckInButton';
import { FormsButton } from '@/components/forms/FormsButton';
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
            <ShareCheckInButton eventId={event.id} />
            <FormsButton eventId={event.id} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive h-10 w-10 ml-auto">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
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
