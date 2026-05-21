import { ThoughtLeadership } from '../types';
import {
  getListItems,
  createListItem,
  updateListItem,
  deleteListItem,
} from './graphClient';
import { sharepointConfig } from '../config/authConfig';

const LIST_NAME = sharepointConfig.listNames.thoughtLeadership;

export async function getThoughtLeadershipItems(siteId: string): Promise<ThoughtLeadership[]> {
  return getListItems<ThoughtLeadership>(siteId, LIST_NAME, undefined, undefined, 'fields/SubmissionDeadline');
}

export async function createTLItem(
  siteId: string,
  item: Omit<ThoughtLeadership, 'id'>
): Promise<ThoughtLeadership> {
  return createListItem(siteId, LIST_NAME, item as unknown as Record<string, unknown>) as unknown as ThoughtLeadership;
}

export async function updateTLItem(
  siteId: string,
  itemId: string,
  updates: Partial<ThoughtLeadership>
): Promise<void> {
  await updateListItem(siteId, LIST_NAME, itemId, updates as Record<string, unknown>);
}

export async function deleteTLItem(siteId: string, itemId: string): Promise<void> {
  await deleteListItem(siteId, LIST_NAME, itemId);
}
