import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Input,
  Select,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@fluentui/react-components';
import { Add24Regular, Search24Regular, Filter24Regular } from '@fluentui/react-icons';
import { useEvents } from '../../hooks/useEvents';
import { Event, EventStatus } from '../../types';
import { EventForm } from './EventForm';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  searchInput: {
    minWidth: '250px',
  },
  statusBadge: {
    cursor: 'default',
  },
});

const statusColors: Record<EventStatus, 'success' | 'warning' | 'danger' | 'informative' | 'important'> = {
  Confirmed: 'success',
  Placeholder: 'warning',
  Cancelled: 'danger',
  Done: 'informative',
  Pending: 'important',
};

interface EventTableProps {
  siteId: string;
}

export const EventTable: React.FC<EventTableProps> = ({ siteId }) => {
  const styles = useStyles();
  const { events, loading, addEvent, editEvent, removeEvent } = useEvents(siteId);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      !searchTerm ||
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.teamMembers?.some((m) => m.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    const matchesType = typeFilter === 'all' || event.eventType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleSave = async (eventData: Omit<Event, 'id'>) => {
    if (editingEvent) {
      await editEvent(editingEvent.id, eventData);
    } else {
      await addEvent(eventData);
    }
    setIsFormOpen(false);
    setEditingEvent(null);
  };

  const handleDelete = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      await removeEvent(eventId);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  return (
    <div className={styles.container}>
      <Text size={600} weight="bold">Events</Text>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <Input
          className={styles.searchInput}
          placeholder="Search events or team members..."
          contentBefore={<Search24Regular />}
          value={searchTerm}
          onChange={(_, data) => setSearchTerm(data.value)}
        />
        <Select
          value={statusFilter}
          onChange={(_, data) => setStatusFilter(data.value)}
        >
          <option value="all">All Statuses</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Placeholder">Placeholder</option>
          <option value="Pending">Pending</option>
          <option value="Done">Done</option>
          <option value="Cancelled">Cancelled</option>
        </Select>
        <Select
          value={typeFilter}
          onChange={(_, data) => setTypeFilter(data.value)}
        >
          <option value="all">All Types</option>
          <option value="Trade Show">Trade Show</option>
          <option value="Local / Regional Event">Local Event</option>
          <option value="Panduit ONE Roadshow">Roadshow</option>
          <option value="Consultant Workshop">Workshop</option>
          <option value="Partner Kickoff">Partner Kickoff</option>
          <option value="Webinar">Webinar</option>
        </Select>

        <Dialog open={isFormOpen} onOpenChange={(_, data) => setIsFormOpen(data.open)}>
          <DialogTrigger>
            <Button appearance="primary" icon={<Add24Regular />}>
              New Event
            </Button>
          </DialogTrigger>
          <DialogSurface style={{ maxWidth: '700px' }}>
            <DialogBody>
              <DialogTitle>{editingEvent ? 'Edit Event' : 'New Event'}</DialogTitle>
              <DialogContent>
                <EventForm
                  event={editingEvent}
                  onSave={handleSave}
                  onCancel={() => {
                    setIsFormOpen(false);
                    setEditingEvent(null);
                  }}
                  siteId={siteId}
                />
              </DialogContent>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </div>

      {/* Table */}
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Event Name</TableHeaderCell>
              <TableHeaderCell>Region</TableHeaderCell>
              <TableHeaderCell>Team</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Display</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <Text size={200}>{event.eventType}</Text>
                </TableCell>
                <TableCell>
                  <Text weight="semibold">{event.title}</Text>
                </TableCell>
                <TableCell>{event.theater}</TableCell>
                <TableCell>
                  <Text size={200}>{event.teamMembers?.join(', ')}</Text>
                </TableCell>
                <TableCell>
                  <Text size={200}>
                    {event.startDate ? new Date(event.startDate).toLocaleDateString() : '-'}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text size={200}>{event.displayType}</Text>
                </TableCell>
                <TableCell>
                  <Badge
                    className={styles.statusBadge}
                    appearance="filled"
                    color={statusColors[event.status] || 'informative'}
                  >
                    {event.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="small" appearance="subtle" onClick={() => handleEdit(event)}>
                    Edit
                  </Button>
                  <Button size="small" appearance="subtle" onClick={() => handleDelete(event.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Text size={200}>{filteredEvents.length} events</Text>
    </div>
  );
};
