import { useState, useMemo, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, Users, UserCheck, Clock, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { GuestCard } from "@/components/checkin/GuestCard";
import { ProgressRing } from "@/components/stats/ProgressRing";
import { useGuests, useGuestStats, useCheckIn, useUndoCheckIn } from "@/hooks/useGuests";
import { useStation } from "@/hooks/useStations";
import { useToast } from "@/hooks/use-toast";
import lekkLogo from "@/assets/lekkside-logo.png";

export default function CheckInOnly() {
  const { stationId } = useParams<{ stationId: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "checked-in">("all");
  const { toast } = useToast();

  // Fetch station details to get event ID
  const { data: stationData, isLoading: stationLoading, error: stationError } = useStation(stationId);
  
  const eventId = stationData?.event_id;
  const event = stationData?.events;
  const station = stationData;

  const { data: guests = [], isLoading: guestsLoading } = useGuests(eventId);
  const stats = useGuestStats(eventId);
  const checkIn = useCheckIn();
  const undoCheckIn = useUndoCheckIn();

  const filteredGuests = useMemo(() => {
    let result = guests;

    // Filter by search query
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

    // Filter by tab
    if (activeTab === "pending") {
      result = result.filter((guest) => !guest.checked_in);
    } else if (activeTab === "checked-in") {
      result = result.filter((guest) => guest.checked_in);
    }

    return result;
  }, [guests, searchQuery, activeTab]);

  const handleCheckIn = useCallback((guestId: string) => {
    checkIn.mutate(
      { guestId, userId: null, stationId: stationId || null },
      {
        onSuccess: () => {
          toast({
            title: "Guest checked in!",
            description: "Guest has been successfully checked in.",
          });
        },
        onError: () => {
          toast({
            title: "Check-in failed",
            description: "Failed to check in guest. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  }, [checkIn, stationId, toast]);

  const handleUndoCheckIn = useCallback((guestId: string) => {
    undoCheckIn.mutate(guestId, {
      onSuccess: () => {
        toast({
          title: "Check-in undone",
          description: "Guest check-in has been reversed.",
        });
      },
      onError: () => {
        toast({
          title: "Undo failed",
          description: "Failed to undo check-in. Please try again.",
          variant: "destructive",
        });
      },
    });
  }, [undoCheckIn, toast]);

  // Virtual list for performance with large guest lists
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredGuests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 5,
  });

  if (stationLoading || guestsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (stationError || !station || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Station Not Found</h1>
          <p className="text-muted-foreground">
            This check-in link may be invalid, inactive, or the event has been deleted.
          </p>
        </div>
      </div>
    );
  }

  // Check if station is inactive
  if (!station.is_active) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Station Inactive</h1>
          <p className="text-muted-foreground">
            This check-in station has been deactivated by the event organizer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={lekkLogo} alt="Lekkside" className="h-8 w-auto" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-foreground">Check-in Station</span>
              <span className="text-sm text-muted-foreground">{station.name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Event Info */}
        <div className="bg-card rounded-2xl border p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{event.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {event.date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(event.date), "PPP")}</span>
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{event.venue}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card rounded-2xl border p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ProgressRing percentage={stats.percentage} size={100} strokeWidth={8} />
            <div className="flex-1 grid grid-cols-3 gap-4 w-full sm:w-auto">
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Total</span>
                </div>
                <div className="text-xl font-bold text-foreground">{stats.total}</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-muted-foreground mb-1">
                  <UserCheck className="h-4 w-4" />
                  <span className="text-xs">Checked In</span>
                </div>
                <div className="text-xl font-bold text-green-600">{stats.checkedIn}</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Pending</span>
                </div>
                <div className="text-xl font-bold text-amber-600">{stats.pending}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Tabs */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex-1">
                Pending ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="checked-in" className="flex-1">
                Done ({stats.checkedIn})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Guest List - Virtualized */}
        {filteredGuests.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {searchQuery
                ? "No guests found matching your search"
                : stats.total === 0
                ? "No guests registered for this event"
                : "No guests in this category"}
            </p>
          </div>
        ) : (
          <div
            ref={parentRef}
            className="h-[calc(100vh-480px)] min-h-[300px] overflow-auto"
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const guest = filteredGuests[virtualRow.index];
                return (
                  <div
                    key={guest.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      padding: '6px 0',
                    }}
                  >
                    <GuestCard
                      guest={guest}
                      onCheckIn={handleCheckIn}
                      onUndoCheckIn={handleUndoCheckIn}
                      isLoading={checkIn.isPending || undoCheckIn.isPending}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
