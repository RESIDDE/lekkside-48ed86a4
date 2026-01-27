import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Guest = Tables<'guests'>;
type GuestInsert = TablesInsert<'guests'>;
type GuestUpdate = TablesUpdate<'guests'>;

export function useGuests(eventId: string | undefined) {
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel('guests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['guests', eventId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  return useQuery({
    queryKey: ['guests', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      // Fetch up to 10,000 guests using pagination
      const pageSize = 1000;
      const maxGuests = 10000;
      const allGuests: Guest[] = [];
      
      for (let page = 0; page < maxGuests / pageSize; page++) {
        const { data, error } = await supabase
          .from('guests')
          .select('*')
          .eq('event_id', eventId)
          .order('last_name', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allGuests.push(...(data as Guest[]));
        
        if (data.length < pageSize) break; // No more pages
      }
      
      return allGuests;
    },
    enabled: !!eventId,
  });
}

export function useGuestStats(eventId: string | undefined) {
  const { data: guests } = useGuests(eventId);
  
  const total = guests?.length ?? 0;
  const checkedIn = guests?.filter(g => g.checked_in).length ?? 0;
  const pending = total - checkedIn;
  const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
  
  const ticketTypes = guests?.reduce((acc, guest) => {
    const type = guest.ticket_type || 'General';
    if (!acc[type]) {
      acc[type] = { total: 0, checkedIn: 0 };
    }
    acc[type].total++;
    if (guest.checked_in) acc[type].checkedIn++;
    return acc;
  }, {} as Record<string, { total: number; checkedIn: number }>);

  return { total, checkedIn, pending, percentage, ticketTypes };
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ guestId, userId, stationId }: { guestId: string; userId?: string | null; stationId?: string | null }) => {
      const { data, error } = await supabase
        .from('guests')
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
          checked_in_by: userId || null,
          checked_in_by_station: stationId || null,
        })
        .eq('id', guestId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['guests', data.event_id] });
      queryClient.invalidateQueries({ queryKey: ['station-stats'] });
    },
  });
}

export function useUndoCheckIn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (guestId: string) => {
      const { data, error } = await supabase
        .from('guests')
        .update({
          checked_in: false,
          checked_in_at: null,
          checked_in_by: null,
          checked_in_by_station: null,
        })
        .eq('id', guestId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['guests', data.event_id] });
      queryClient.invalidateQueries({ queryKey: ['station-stats'] });
    },
  });
}

export function useImportGuests() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, guests }: { eventId: string; guests: Omit<GuestInsert, 'event_id'>[] }) => {
      const guestsWithEventId = guests.map(guest => ({
        ...guest,
        event_id: eventId,
      }));
      
      const { data, error } = await supabase
        .from('guests')
        .insert(guestsWithEventId)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['guests', eventId] });
    },
  });
}

export function useDeleteGuest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (guestId: string) => {
      const { data, error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['guests', data.event_id] });
    },
  });
}

export function useDeleteAllGuests() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('event_id', eventId);
      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['guests', eventId] });
    },
  });
}
