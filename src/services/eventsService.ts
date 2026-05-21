import { Event } from '../types';
import {
  getListItems,
  createListItem,
  updateListItem,
  deleteListItem,
} from './graphClient';
import { sharepointConfig } from '../config/authConfig';

const LIST_NAME = sharepointConfig.listNames.events;

export async function getEvents(siteId: string, year?: number): Promise<Event[]> {
  const filter = year ? `fields/Year eq ${year}` : undefined;
  return getListItems<Event>(siteId, LIST_NAME, undefined, filter, 'fields/StartDate');
}

export async function getEventById(siteId: string, eventId: string): Promise<Event | null> {
  const events = await getListItems<Event>(siteId, LIST_NAME, undefined, `id eq '${eventId}'`);
  return events[0] || null;
}

export async function createEvent(siteId: string, event: Omit<Event, 'id'>): Promise<Event> {
  // Auto-calculate graphics deadline (8 weeks before start date)
  const fields = { ...event } as Record<string, unknown>;
  if (event.startDate && !event.graphicsDeadline) {
    const start = new Date(event.startDate);
    start.setDate(start.getDate() - 56);
    fields.graphicsDeadline = start.toISOString().split('T')[0];
  }
  return createListItem<Record<string, unknown>>(siteId, LIST_NAME, fields) as unknown as Event;
}

export async function updateEvent(
  siteId: string,
  eventId: string,
  updates: Partial<Event>
): Promise<void> {
  // Recalculate graphics deadline if start date changes
  const fields = { ...updates } as Record<string, unknown>;
  if (updates.startDate && !updates.graphicsDeadline) {
    const start = new Date(updates.startDate);
    start.setDate(start.getDate() - 56);
    fields.graphicsDeadline = start.toISOString().split('T')[0];
  }
  await updateListItem(siteId, LIST_NAME, eventId, fields);
}

export async function deleteEvent(siteId: string, eventId: string): Promise<void> {
  await deleteListItem(siteId, LIST_NAME, eventId);
}

// Get events for a specific team member
export async function getEventsByTeamMember(
  siteId: string,
  memberName: string
): Promise<Event[]> {
  const allEvents = await getEvents(siteId);
  return allEvents.filter((e) =>
    e.teamMembers?.some((m) => m.toLowerCase().includes(memberName.toLowerCase()))
  );
}

// Check for scheduling conflicts
export async function checkConflicts(
  siteId: string,
  teamMember: string,
  startDate: string,
  endDate: string,
  excludeEventId?: string
): Promise<Event[]> {
  const memberEvents = await getEventsByTeamMember(siteId, teamMember);
  return memberEvents.filter((e) => {
    if (excludeEventId && e.id === excludeEventId) return false;
    const eStart = new Date(e.startDate);
    const eEnd = new Date(e.endDate);
    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);
    return eStart <= newEnd && eEnd >= newStart;
  });
}
