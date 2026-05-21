import { DropdownOption } from '../types';
import { getListItems, createListItem, updateListItem } from './graphClient';
import { sharepointConfig } from '../config/authConfig';

const LIST_NAME = sharepointConfig.listNames.dropdownConfig;

export async function getDropdownOptions(
  siteId: string,
  category?: string
): Promise<DropdownOption[]> {
  const filter = category ? `fields/category eq '${category}'` : undefined;
  const items = await getListItems<DropdownOption>(
    siteId,
    LIST_NAME,
    undefined,
    filter,
    'fields/sortOrder'
  );
  return items.filter((item) => item.isActive);
}

export async function createDropdownOption(
  siteId: string,
  option: Omit<DropdownOption, 'id'>
): Promise<DropdownOption> {
  return createListItem(siteId, LIST_NAME, option as unknown as Record<string, unknown>) as unknown as DropdownOption;
}

export async function updateDropdownOption(
  siteId: string,
  optionId: string,
  updates: Partial<DropdownOption>
): Promise<void> {
  await updateListItem(siteId, LIST_NAME, optionId, updates as Record<string, unknown>);
}

// Soft-delete (set isActive = false)
export async function deactivateDropdownOption(
  siteId: string,
  optionId: string
): Promise<void> {
  await updateListItem(siteId, LIST_NAME, optionId, { isActive: false });
}
