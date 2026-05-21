import React from 'react';
import {
  makeStyles,
  tokens,
  Tab,
  TabList,
} from '@fluentui/react-components';
import {
  CalendarLtr24Regular,
  List24Regular,
  Box24Regular,
  Mic24Regular,
  People24Regular,
  Settings24Regular,
} from '@fluentui/react-icons';
import { ViewMode } from '../../types';

const useStyles = makeStyles({
  nav: {
    display: 'flex',
    flexDirection: 'column',
    width: '200px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    padding: tokens.spacingVerticalM,
  },
});

interface NavigationProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeView, onViewChange }) => {
  const styles = useStyles();

  return (
    <nav className={styles.nav}>
      <TabList
        vertical
        selectedValue={activeView}
        onTabSelect={(_, data) => onViewChange(data.value as ViewMode)}
      >
        <Tab value="calendar" icon={<CalendarLtr24Regular />}>
          Calendar
        </Tab>
        <Tab value="list" icon={<List24Regular />}>
          Events
        </Tab>
        <Tab value="assets" icon={<Box24Regular />}>
          Assets
        </Tab>
        <Tab value="thoughtLeadership" icon={<Mic24Regular />}>
          Thought Leadership
        </Tab>
        <Tab value="team" icon={<People24Regular />}>
          Team Travel
        </Tab>
        <Tab value="admin" icon={<Settings24Regular />}>
          Admin
        </Tab>
      </TabList>
    </nav>
  );
};
