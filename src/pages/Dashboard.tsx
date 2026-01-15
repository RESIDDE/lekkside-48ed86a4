import { Users, Calendar, CheckCircle, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/stats/StatsCard';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { useEvents } from '@/hooks/useEvents';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: events, isLoading } = useEvents();

  const upcomingEvents = events?.filter(e => !e.date || new Date(e.date) >= new Date()) || [];
  const totalEvents = events?.length ?? 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your events and track check-ins in real-time.
            </p>
          </div>
          <CreateEventDialog />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Events"
            value={totalEvents}
            icon={<Calendar className="w-5 h-5" />}
          />
          <StatsCard
            title="Upcoming Events"
            value={upcomingEvents.length}
            icon={<Clock className="w-5 h-5" />}
          />
          <StatsCard
            title="Total Guests"
            value="—"
            subtitle="Across all events"
            icon={<Users className="w-5 h-5" />}
          />
          <StatsCard
            title="Checked In Today"
            value="—"
            icon={<CheckCircle className="w-5 h-5" />}
          />
        </div>

        {/* Recent Events */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Recent Events</h2>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : events && events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.slice(0, 6).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground">No events yet</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                Create your first event to start importing guests and tracking check-ins.
              </p>
              <CreateEventDialog />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
