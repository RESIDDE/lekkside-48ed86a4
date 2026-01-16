import { Calendar } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { useEvents } from '@/hooks/useEvents';
import { Skeleton } from '@/components/ui/skeleton';

export default function Events() {
  const { data: events, isLoading } = useEvents();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Events</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage all your events and guest lists
            </p>
          </div>
          <CreateEventDialog />
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16 bg-card rounded-2xl border-2 border-dashed border-border">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No events yet</h3>
            <p className="text-muted-foreground mt-1 mb-5 text-sm">
              Create your first event to get started
            </p>
            <CreateEventDialog />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
