import { useState, useEffect, useCallback } from 'react';
import { Event, TeamMember } from '../types';
import { getEvents } from '../services/eventsService';
import { getListItems } from '../services/graphClient';
import { sharepointConfig } from '../config/authConfig';

export function useTeam(siteId: string | null) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [travelSchedule, setTravelSchedule] = useState<Map<string, Event[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const [memberData, events] = await Promise.all([
        getListItems<TeamMember>(siteId, sharepointConfig.listNames.teamMembers),
        getEvents(siteId),
      ]);
      setMembers(memberData.filter((m) => m.isActive));

      // Build travel schedule per team member
      const schedule = new Map<string, Event[]>();
      for (const member of memberData) {
        const memberEvents = events.filter((e) =>
          e.teamMembers?.some((m) => m.toLowerCase().includes(member.displayName.toLowerCase()))
        );
        schedule.set(member.displayName, memberEvents);
      }
      setTravelSchedule(schedule);
    } catch {
      // Silently handle - team data is supplementary
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { members, travelSchedule, loading, refresh };
}
