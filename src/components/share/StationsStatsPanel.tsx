import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStationStats } from "@/hooks/useStations";
import { Skeleton } from "@/components/ui/skeleton";

interface StationsStatsPanelProps {
  eventId: string;
}

export function StationsStatsPanel({ eventId }: StationsStatsPanelProps) {
  const { data: stats, isLoading } = useStationStats(eventId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Check-in Stations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.length === 0) {
    return null;
  }

  const totalCheckIns = stats.reduce((sum, s) => sum + s.check_in_count, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Check-in by Station
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stats.map((station) => (
            <div key={station.station_id} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{station.station_name}</p>
                {station.last_check_in && (
                  <p className="text-xs text-muted-foreground">
                    Last: {formatTimeAgo(station.last_check_in)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="font-semibold">{station.check_in_count}</span>
                <span className="text-muted-foreground text-sm ml-1">
                  ({totalCheckIns > 0 ? Math.round((station.check_in_count / totalCheckIns) * 100) : 0}%)
                </span>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t flex items-center justify-between font-medium">
            <span>Total via stations</span>
            <span>{totalCheckIns}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
