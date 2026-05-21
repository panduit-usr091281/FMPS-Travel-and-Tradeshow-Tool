import { Client } from '@microsoft/microsoft-graph-client';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalInstance } from '../main';
import { loginRequest } from '../config/authConfig';

async function getAccessToken(): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('No accounts found. User must sign in.');
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });
    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      const response = await msalInstance.acquireTokenPopup(loginRequest);
      return response.accessToken;
    }
    throw error;
  }
}

export function getGraphClient(): Client {
  return Client.init({
    authProvider: async (done) => {
      try {
        const token = await getAccessToken();
        done(null, token);
      } catch (error) {
        done(error as Error, null);
      }
    },
  });
}

// Helper: Get SharePoint site ID
export async function getSiteId(siteUrl: string): Promise<string> {
  const client = getGraphClient();
  const url = new URL(siteUrl);
  const response = await client
    .api(`/sites/${url.hostname}:${url.pathname}`)
    .get();
  return response.id;
}

// Helper: Get list items with paging
export async function getListItems<T>(
  siteId: string,
  listName: string,
  select?: string[],
  filter?: string,
  orderBy?: string
): Promise<T[]> {
  const client = getGraphClient();
  let request = client.api(`/sites/${siteId}/lists/${listName}/items`).expand('fields');

  if (select) {
    request = request.select(select.map((s) => `fields/${s}`).join(','));
  }
  if (filter) {
    request = request.filter(filter);
  }
  if (orderBy) {
    request = request.orderby(orderBy);
  }

  const response = await request.top(500).get();
  return response.value.map((item: { id: string; fields: T }) => ({
    id: item.id,
    ...item.fields,
  }));
}

// Helper: Create list item
export async function createListItem<T extends Record<string, unknown>>(
  siteId: string,
  listName: string,
  fields: T
): Promise<T & { id: string }> {
  const client = getGraphClient();
  const response = await client
    .api(`/sites/${siteId}/lists/${listName}/items`)
    .post({ fields });
  return { id: response.id, ...response.fields };
}

// Helper: Update list item
export async function updateListItem<T extends Record<string, unknown>>(
  siteId: string,
  listName: string,
  itemId: string,
  fields: Partial<T>
): Promise<void> {
  const client = getGraphClient();
  await client
    .api(`/sites/${siteId}/lists/${listName}/items/${itemId}/fields`)
    .patch(fields);
}

// Helper: Delete list item
export async function deleteListItem(
  siteId: string,
  listName: string,
  itemId: string
): Promise<void> {
  const client = getGraphClient();
  await client
    .api(`/sites/${siteId}/lists/${listName}/items/${itemId}`)
    .delete();
}
