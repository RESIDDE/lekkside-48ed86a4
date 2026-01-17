import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CheckinStation {
  id: string;
  event_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StationStats {
  station_id: string;
  station_name: string;
  check_in_count: number;
  last_check_in: string | null;
}

export function useStations(eventId: string | undefined) {
  return useQuery({
    queryKey: ["stations", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from("checkin_stations")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as CheckinStation[];
    },
    enabled: !!eventId,
  });
}

export function useStation(stationId: string | undefined) {
  return useQuery({
    queryKey: ["station", stationId],
    queryFn: async () => {
      if (!stationId) return null;
      
      const { data, error } = await supabase
        .from("checkin_stations")
        .select("*, events(*)")
        .eq("id", stationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!stationId,
  });
}

export function useStationStats(eventId: string | undefined) {
  return useQuery({
    queryKey: ["station-stats", eventId],
    queryFn: async () => {
      if (!eventId) return [];

      // First get all stations for this event
      const { data: stations, error: stationsError } = await supabase
        .from("checkin_stations")
        .select("id, name")
        .eq("event_id", eventId);

      if (stationsError) throw stationsError;

      // Then get check-in counts for each station
      const stats: StationStats[] = [];
      
      for (const station of stations || []) {
        const { data: guests, error: guestsError } = await supabase
          .from("guests")
          .select("checked_in_at")
          .eq("event_id", eventId)
          .eq("checked_in_by_station", station.id)
          .eq("checked_in", true);

        if (guestsError) throw guestsError;

        const sortedByTime = guests?.sort((a, b) => 
          new Date(b.checked_in_at || 0).getTime() - new Date(a.checked_in_at || 0).getTime()
        );

        stats.push({
          station_id: station.id,
          station_name: station.name,
          check_in_count: guests?.length || 0,
          last_check_in: sortedByTime?.[0]?.checked_in_at || null,
        });
      }

      return stats;
    },
    enabled: !!eventId,
  });
}

export function useCreateStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, name }: { eventId: string; name: string }) => {
      const { data, error } = await supabase
        .from("checkin_stations")
        .insert({ event_id: eventId, name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stations", variables.eventId] });
    },
  });
}

export function useToggleStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stationId, isActive }: { stationId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("checkin_stations")
        .update({ is_active: isActive })
        .eq("id", stationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    },
  });
}

export function useDeleteStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stationId: string) => {
      const { error } = await supabase
        .from("checkin_stations")
        .delete()
        .eq("id", stationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stations"] });
    },
  });
}
