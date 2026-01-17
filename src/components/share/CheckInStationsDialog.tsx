import { useState } from "react";
import { Users, Copy, Check, QrCode, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useStations, useCreateStation, useToggleStation, useDeleteStation, useStationStats } from "@/hooks/useStations";
import { StationQRCodeDialog } from "./StationQRCodeDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface CheckInStationsDialogProps {
  eventId: string;
}

export function CheckInStationsDialog({ eventId }: CheckInStationsDialogProps) {
  const [open, setOpen] = useState(false);
  const [newStationName, setNewStationName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrStation, setQrStation] = useState<{ id: string; name: string } | null>(null);
  
  const { toast } = useToast();
  const { data: stations, isLoading } = useStations(eventId);
  const { data: stats } = useStationStats(eventId);
  const createStation = useCreateStation();
  const toggleStation = useToggleStation();
  const deleteStation = useDeleteStation();

  const getStationUrl = (stationId: string) => 
    `${window.location.origin}/checkin/${stationId}`;

  const handleCopy = async (stationId: string) => {
    try {
      await navigator.clipboard.writeText(getStationUrl(stationId));
      setCopiedId(stationId);
      toast({
        title: "Link copied!",
        description: "Check-in station link has been copied to clipboard",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    if (!newStationName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the station",
        variant: "destructive",
      });
      return;
    }

    try {
      await createStation.mutateAsync({ eventId, name: newStationName.trim() });
      setNewStationName("");
      toast({
        title: "Station created",
        description: "New check-in station has been created",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to create station",
        variant: "destructive",
      });
    }
  };

  const handleToggle = async (stationId: string, currentStatus: boolean) => {
    try {
      await toggleStation.mutateAsync({ stationId, isActive: !currentStatus });
      toast({
        title: currentStatus ? "Station deactivated" : "Station activated",
        description: currentStatus 
          ? "The station link is now disabled" 
          : "The station link is now active",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update station",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (stationId: string, stationName: string) => {
    try {
      await deleteStation.mutateAsync(stationId);
      toast({
        title: "Station deleted",
        description: `"${stationName}" has been deleted`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete station",
        variant: "destructive",
      });
    }
  };

  const getStationStats = (stationId: string) => {
    return stats?.find(s => s.station_id === stationId);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Check-in Stations</span>
            <span className="sm:hidden">Stations</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Check-in Stations</DialogTitle>
            <DialogDescription>
              Create multiple check-in links to track which team or location checked in each guest.
            </DialogDescription>
          </DialogHeader>

          {/* Create new station */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Station name (e.g., Front Door)"
              value={newStationName}
              onChange={(e) => setNewStationName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={createStation.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Stations list */}
          <div className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : stations?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No stations created yet</p>
                <p className="text-sm">Create a station to generate a shareable check-in link</p>
              </div>
            ) : (
              stations?.map((station) => {
                const stationStats = getStationStats(station.id);
                return (
                  <div
                    key={station.id}
                    className={`p-4 rounded-xl border ${
                      station.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{station.name}</h4>
                          {!station.is_active && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">Inactive</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium text-foreground">
                            {stationStats?.check_in_count || 0}
                          </span>{" "}
                          check-ins
                          {stationStats?.last_check_in && (
                            <span className="ml-2">
                              · Last: {formatTimeAgo(stationStats.last_check_in)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(station.id)}
                          title="Copy link"
                        >
                          {copiedId === station.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setQrStation({ id: station.id, name: station.name })}
                          title="Show QR code"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(station.id, station.is_active)}
                          title={station.is_active ? "Deactivate" : "Activate"}
                        >
                          {station.is_active ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(station.id, station.name)}
                          title="Delete station"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {qrStation && (
        <StationQRCodeDialog
          stationId={qrStation.id}
          stationName={qrStation.name}
          open={!!qrStation}
          onOpenChange={(open) => !open && setQrStation(null)}
        />
      )}
    </>
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
