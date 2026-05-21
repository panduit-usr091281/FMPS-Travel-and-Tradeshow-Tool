import { useState, useEffect, useCallback } from 'react';
import { Event } from '../types';
import { getEvents, createEvent, updateEvent, deleteEvent, checkConflicts } from '../services/eventsService';

export function useEvents(siteId: string | null, year?: number) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const data = await getEvents(siteId, year);
      setEvents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [siteId, year]);

  useEffect(() => {
    refresh();
    // Poll for updates every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const addEvent = async (event: Omit<Event, 'id'>) => {
    if (!siteId) return;
    const created = await createEvent(siteId, event);
    setEvents((prev) => [...prev, created]);
    return created;
  };

  const editEvent = async (eventId: string, updates: Partial<Event>) => {
    if (!siteId) return;
    await updateEvent(siteId, eventId, updates);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...updates } : e)));
  };

  const removeEvent = async (eventId: string) => {
    if (!siteId) return;
    await deleteEvent(siteId, eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const findConflicts = async (teamMember: string, startDate: string, endDate: string, excludeId?: string) => {
    if (!siteId) return [];
    return checkConflicts(siteId, teamMember, startDate, endDate, excludeId);
  };

  return { events, loading, error, refresh, addEvent, editEvent, removeEvent, findConflicts };
}
