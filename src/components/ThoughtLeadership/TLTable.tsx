import React from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  Button,
} from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';
import { useState, useEffect } from 'react';
import { ThoughtLeadership } from '../../types';
import { getThoughtLeadershipItems } from '../../services/tlService';

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
  },
});

const statusColors = {
  Draft: 'informative' as const,
  Submitted: 'warning' as const,
  Approved: 'success' as const,
  Presented: 'important' as const,
};

interface TLTableProps {
  siteId: string;
}

export const TLTable: React.FC<TLTableProps> = ({ siteId }) => {
  const styles = useStyles();
  const [items, setItems] = useState<ThoughtLeadership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getThoughtLeadershipItems(siteId);
        setItems(data);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [siteId]);

  return (
    <div className={styles.container}>
      <Text size={600} weight="bold">Thought Leadership & Speaking</Text>

      <div className={styles.toolbar}>
        <Button appearance="primary" icon={<Add24Regular />}>
          New Submission
        </Button>
      </div>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Event / Publication</TableHeaderCell>
              <TableHeaderCell>Title</TableHeaderCell>
              <TableHeaderCell>Speaker(s)</TableHeaderCell>
              <TableHeaderCell>Submission Deadline</TableHeaderCell>
              <TableHeaderCell>Event Date</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Text weight="semibold">{item.eventName}</Text>
                </TableCell>
                <TableCell>{item.presentationTitle}</TableCell>
                <TableCell>
                  <Text size={200}>{item.speakers?.join(', ')}</Text>
                </TableCell>
                <TableCell>
                  {item.submissionDeadline
                    ? new Date(item.submissionDeadline).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell>
                  {item.eventDateTime
                    ? new Date(item.eventDateTime).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell>
                  <Badge appearance="filled" color={statusColors[item.status]}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="small" appearance="subtle">Edit</Button>
                  <Button size="small" appearance="subtle">View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
