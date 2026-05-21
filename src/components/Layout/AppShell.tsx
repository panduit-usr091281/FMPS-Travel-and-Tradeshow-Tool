import React, { useState } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { ViewMode } from '../../types';
import { CalendarView } from '../Calendar/CalendarView';
import { EventTable } from '../Events/EventTable';
import { AssetInventory } from '../Assets/AssetInventory';
import { TLTable } from '../ThoughtLeadership/TLTable';
import { TeamCalendar } from '../Team/TeamCalendar';
import { DropdownManager } from '../Admin/DropdownManager';

const useStyles = makeStyles({
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
  },
});

interface AppShellProps {
  siteId: string;
}

export const AppShell: React.FC<AppShellProps> = ({ siteId }) => {
  const styles = useStyles();
  const [activeView, setActiveView] = useState<ViewMode>('calendar');

  const renderContent = () => {
    switch (activeView) {
      case 'calendar':
        return <CalendarView siteId={siteId} />;
      case 'list':
        return <EventTable siteId={siteId} />;
      case 'assets':
        return <AssetInventory siteId={siteId} />;
      case 'thoughtLeadership':
        return <TLTable siteId={siteId} />;
      case 'team':
        return <TeamCalendar siteId={siteId} />;
      case 'admin':
        return <DropdownManager siteId={siteId} />;
      default:
        return <CalendarView siteId={siteId} />;
    }
  };

  return (
    <div className={styles.shell}>
      <Header />
      <div className={styles.body}>
        <Navigation activeView={activeView} onViewChange={setActiveView} />
        <main className={styles.content}>{renderContent()}</main>
      </div>
    </div>
  );
};
