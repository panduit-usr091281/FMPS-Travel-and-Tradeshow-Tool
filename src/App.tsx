import React, { useState, useEffect } from 'react';
import { FluentProvider, webLightTheme, Spinner, Text } from '@fluentui/react-components';
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { loginRequest, sharepointConfig } from './config/authConfig';
import { AppShell } from './components/Layout/AppShell';
import { getSiteId } from './services/graphClient';
import { msalInstance } from './main';

const AuthenticatedApp: React.FC = () => {
  const { instance } = useMsal();
  const [siteId, setSiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initSite = async () => {
      try {
        const id = await getSiteId(sharepointConfig.siteUrl);
        setSiteId(id);
      } catch (err) {
        setError('Failed to connect to SharePoint site. Please check configuration.');
        console.error(err);
      }
    };
    initSite();
  }, []);

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Text size={500} weight="bold">Connection Error</Text>
        <br />
        <Text>{error}</Text>
      </div>
    );
  }

  if (!siteId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spinner label="Connecting to SharePoint..." />
      </div>
    );
  }

  return <AppShell siteId={siteId} />;
};

const LoginPrompt: React.FC = () => {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginPopup(loginRequest);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem' }}>
      <Text size={700} weight="bold">FMPS Marketing & Trade Show Coordination</Text>
      <Text size={400}>Sign in with your Panduit Microsoft 365 account to access the tool.</Text>
      <button
        onClick={handleLogin}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#0078d4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '1rem',
        }}
      >
        Sign In with Microsoft
      </button>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <FluentProvider theme={webLightTheme}>
      <MsalProvider instance={msalInstance}>
        <AuthenticatedTemplate>
          <AuthenticatedApp />
        </AuthenticatedTemplate>
        <UnauthenticatedTemplate>
          <LoginPrompt />
        </UnauthenticatedTemplate>
      </MsalProvider>
    </FluentProvider>
  );
};

export default App;
