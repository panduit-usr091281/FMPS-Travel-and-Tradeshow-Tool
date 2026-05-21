import React from 'react';
import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Text,
  Badge,
} from '@fluentui/react-components';
import { Event } from '../../types';

const useStyles = makeStyles({
  card: {
    marginBottom: tokens.spacingVerticalXS,
    cursor: 'pointer',
    '&:hover': {
      boxShadow: tokens.shadow8,
    },
  },
  confirmed: { borderLeft: `4px solid ${tokens.colorPaletteGreenBorder2}` },
  placeholder: { borderLeft: `4px solid ${tokens.colorPaletteYellowBorder2}` },
  cancelled: { borderLeft: `4px solid ${tokens.colorPaletteRedBorder2}` },
  done: { borderLeft: `4px solid ${tokens.colorNeutralStroke1}` },
  pending: { borderLeft: `4px solid ${tokens.colorPaletteBlueBorder2}` },
});

interface EventCardProps {
  event: Event;
  onClick?: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => {
  const styles = useStyles();

  const statusClass = {
    Confirmed: styles.confirmed,
    Placeholder: styles.placeholder,
    Cancelled: styles.cancelled,
    Done: styles.done,
    Pending: styles.pending,
  }[event.status] || styles.pending;

  return (
    <Card
      className={`${styles.card} ${statusClass}`}
      size="small"
      onClick={() => onClick?.(event)}
    >
      <CardHeader
        header={
          <Text size={200} weight="semibold" truncate wrap={false}>
            {event.title}
          </Text>
        }
        description={
          <Text size={100}>
            {event.eventType} • {event.teamMembers?.join(', ')}
          </Text>
        }
        action={
          <Badge appearance="outline" size="small">
            {event.status}
          </Badge>
        }
      />
    </Card>
  );
};
