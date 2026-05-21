import React from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Card,
  CardHeader,
  Badge,
  Divider,
} from '@fluentui/react-components';
import { useTeam } from '../../hooks/useTeam';
import { format } from 'date-fns';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  memberGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
  memberCard: {
    padding: tokens.spacingVerticalM,
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalS,
  },
  eventItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.spacingVerticalXXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

interface TeamCalendarProps {
  siteId: string;
}

export const TeamCalendar: React.FC<TeamCalendarProps> = ({ siteId }) => {
  const styles = useStyles();
  const { members, travelSchedule, loading } = useTeam(siteId);

  if (loading) return <Text>Loading team data...</Text>;

  return (
    <div className={styles.container}>
      <Text size={600} weight="bold">Team Travel Calendar</Text>
      <Text size={300}>
        View each team member's upcoming travel schedule and detect conflicts.
      </Text>

      <Divider />

      <div className={styles.memberGrid}>
        {members.map((member) => {
          const events = travelSchedule.get(member.displayName) || [];
          const upcomingEvents = events
            .filter((e) => new Date(e.startDate) >= new Date())
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

          return (
            <Card key={member.id} className={styles.memberCard}>
              <CardHeader
                header={<Text weight="bold">{member.displayName}</Text>}
                description={
                  <Badge appearance="outline">
                    {upcomingEvents.length} upcoming trip{upcomingEvents.length !== 1 ? 's' : ''}
                  </Badge>
                }
              />
              <div className={styles.eventList}>
                {upcomingEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className={styles.eventItem}>
                    <Text size={200} truncate wrap={false} style={{ maxWidth: '200px' }}>
                      {event.title}
                    </Text>
                    <Text size={200}>
                      {format(new Date(event.startDate), 'MMM d')}
                    </Text>
                  </div>
                ))}
                {upcomingEvents.length === 0 && (
                  <Text size={200} italic>No upcoming travel</Text>
                )}
                {upcomingEvents.length > 5 && (
                  <Text size={200}>+{upcomingEvents.length - 5} more</Text>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
