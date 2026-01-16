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
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage events and track check-ins in real-time
            </p>
          </div>
          <CreateEventDialog />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="Total Events"
            value={totalEvents}
            icon={<Calendar className="w-5 h-5 sm:w-6 sm:h-6" />}
          />
          <StatsCard
            title="Upcoming"
            value={upcomingEvents.length}
            icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6" />}
          />
          <StatsCard
            title="Total Guests"
            value="—"
            subtitle="All events"
            icon={<Users className="w-5 h-5 sm:w-6 sm:h-6" />}
          />
          <StatsCard
            title="Today"
            value="—"
            subtitle="Checked in"
            icon={<CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
          />
        </div>

        {/* Recent Events */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Recent Events</h2>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : events && events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.slice(0, 6).map((event) => (
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
      </div>
    </AppLayout>
  );
}
