import { Configuration, PopupRequest } from '@azure/msal-browser';

// Replace these with your actual Azure AD App Registration values
export const msalConfig: Configuration = {
  auth: {
    clientId: 'YOUR_CLIENT_ID', // Azure AD App Registration Client ID
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest: PopupRequest = {
  scopes: ['User.Read', 'Sites.ReadWrite.All'],
};

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
};

// SharePoint site configuration
export const sharepointConfig = {
  siteUrl: 'YOUR_SHAREPOINT_SITE_URL', // e.g., 'https://panduit.sharepoint.com/sites/FMPSCoordination'
  listNames: {
    events: 'Events',
    assets: 'Assets',
    assetReservations: 'AssetReservations',
    thoughtLeadership: 'ThoughtLeadership',
    dropdownConfig: 'DropdownConfig',
    teamMembers: 'TeamMembers',
  },
};
