import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Select,
  Card,
  Badge,
  Divider,
} from '@fluentui/react-components';
import {
  ChevronLeft24Regular,
  ChevronRight24Regular,
} from '@fluentui/react-icons';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
  isSameDay,
} from 'date-fns';
import { useEvents } from '../../hooks/useEvents';
import { Event } from '../../types';
import { EventCard } from './EventCard';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    backgroundColor: tokens.colorNeutralStroke1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  dayHeader: {
    padding: tokens.spacingVerticalXS,
    textAlign: 'center',
    backgroundColor: tokens.colorNeutralBackground3,
    fontWeight: tokens.fontWeightSemibold,
  },
  dayCell: {
    minHeight: '120px',
    padding: tokens.spacingVerticalXS,
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
  },
  today: {
    backgroundColor: tokens.colorBrandBackground2,
  },
  otherMonth: {
    backgroundColor: tokens.colorNeutralBackground2,
    opacity: 0.6,
  },
  dayNumber: {
    marginBottom: tokens.spacingVerticalXXS,
  },
  statsBar: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
  },
  statCard: {
    padding: tokens.spacingVerticalS,
  },
});

interface CalendarViewProps {
  siteId: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ siteId }) => {
  const styles = useStyles();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { events, loading } = useEvents(siteId, selectedYear);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date): Event[] => {
    return events.filter((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      return day >= start && day <= end;
    });
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
    setSelectedYear(newDate.getFullYear());
  };

  const upcomingEvents = events.filter(
    (e) => new Date(e.startDate) >= new Date() && e.status !== 'Cancelled'
  ).length;
  const confirmedEvents = events.filter((e) => e.status === 'Confirmed').length;

  return (
    <div className={styles.container}>
      {/* Stats */}
      <div className={styles.statsBar}>
        <Card className={styles.statCard} size="small">
          <Badge appearance="filled" color="brand">{upcomingEvents} upcoming</Badge>
        </Card>
        <Card className={styles.statCard} size="small">
          <Badge appearance="filled" color="success">{confirmedEvents} confirmed</Badge>
        </Card>
        <Card className={styles.statCard} size="small">
          <Badge appearance="filled" color="warning">
            {events.filter((e) => e.status === 'Placeholder').length} pending
          </Badge>
        </Card>
      </div>

      <Divider />

      {/* Calendar Header */}
      <div className={styles.header}>
        <div className={styles.navButtons}>
          <Button
            icon={<ChevronLeft24Regular />}
            appearance="subtle"
            onClick={() => navigateMonth(-1)}
          />
          <Text size={600} weight="bold">
            {format(currentDate, 'MMMM yyyy')}
          </Text>
          <Button
            icon={<ChevronRight24Regular />}
            appearance="subtle"
            onClick={() => navigateMonth(1)}
          />
        </div>
        <Select
          value={String(selectedYear)}
          onChange={(_, data) => {
            setSelectedYear(Number(data.value));
            const newDate = new Date(currentDate);
            newDate.setFullYear(Number(data.value));
            setCurrentDate(newDate);
          }}
        >
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
        </Select>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <Text>Loading events...</Text>
      ) : (
        <div className={styles.grid}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className={styles.dayHeader}>
              <Text size={200}>{day}</Text>
            </div>
          ))}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const cellClass = [
              styles.dayCell,
              isToday(day) ? styles.today : '',
              !isSameMonth(day, currentDate) ? styles.otherMonth : '',
            ].join(' ');

            return (
              <div key={day.toISOString()} className={cellClass}>
                <Text
                  size={200}
                  weight={isToday(day) ? 'bold' : 'regular'}
                  className={styles.dayNumber}
                >
                  {format(day, 'd')}
                </Text>
                {dayEvents.slice(0, 3).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
                {dayEvents.length > 3 && (
                  <Text size={100}>+{dayEvents.length - 3} more</Text>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
