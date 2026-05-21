import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Input,
  Select,
  Textarea,
  Button,
  Field,
  TagPicker,
  Tag,
  TagPickerInput,
  TagPickerList,
  TagPickerOption,
  TagPickerGroup,
} from '@fluentui/react-components';
import { Event, EventType, EventStatus, Theater, BoothSize } from '../../types';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalM,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalL,
  },
});

const EVENT_TYPES: EventType[] = [
  'Trade Show', 'Trade Show + Partner Booth', 'Trade Show + Speaking',
  'Trade Show + Industry Training', 'Thought Leadership', 'Local / Regional Event',
  'Webinar', 'PEC Event', 'Partner Onboarding', 'Panduit ONE Roadshow',
  'Sales Training', 'FMPS Sales Pitch', 'Consultant Workshop', 'Distributer Event',
  'Customer Visit', 'Marketing Event', 'Hands-On Demo', 'Partner Kickoff',
];

const TEAM_MEMBERS = ['Mahmoud', 'Vince', 'Chuks', 'Bob', 'Deb', 'Joe', 'Jeff Yeary', 'Greg Batcho'];

interface EventFormProps {
  event?: Event | null;
  onSave: (event: Omit<Event, 'id'>) => Promise<void>;
  onCancel: () => void;
  siteId: string;
}

export const EventForm: React.FC<EventFormProps> = ({ event, onSave, onCancel }) => {
  const styles = useStyles();
  const [formData, setFormData] = useState<Partial<Event>>(
    event || {
      status: 'Pending',
      theater: 'NA',
      year: new Date().getFullYear(),
      teamMembers: [],
    }
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title: formData.title || '',
        eventType: formData.eventType || 'Trade Show',
        theater: formData.theater || 'NA',
        tradeshowOwner: formData.tradeshowOwner || '',
        buOwner: formData.buOwner || '',
        teamMembers: formData.teamMembers || [],
        displayType: formData.displayType || '',
        status: formData.status || 'Pending',
        speakerDeadline: formData.speakerDeadline,
        startDate: formData.startDate || '',
        endDate: formData.endDate || formData.startDate || '',
        budget: formData.budget,
        support: formData.support,
        travelDetails: formData.travelDetails,
        leadsData: formData.leadsData,
        showNotes: formData.showNotes,
        year: formData.year || new Date().getFullYear(),
        boothSize: formData.boothSize,
        boothProperty: formData.boothProperty,
        createdBy: '',
        modifiedDate: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof Event>(field: K, value: Event[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Field label="Event Name" required>
        <Input
          value={formData.title || ''}
          onChange={(_, data) => updateField('title', data.value)}
        />
      </Field>

      <div className={styles.row}>
        <Field label="Event Type" required>
          <Select
            value={formData.eventType || ''}
            onChange={(_, data) => updateField('eventType', data.value as EventType)}
          >
            <option value="">Select...</option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select
            value={formData.status || 'Pending'}
            onChange={(_, data) => updateField('status', data.value as EventStatus)}
          >
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Placeholder">Placeholder</option>
            <option value="Done">Done</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
        </Field>
      </div>

      <div className={styles.row}>
        <Field label="Region/Theater">
          <Select
            value={formData.theater || 'NA'}
            onChange={(_, data) => updateField('theater', data.value as Theater)}
          >
            <option value="NA">NA</option>
            <option value="LATAM">LATAM</option>
            <option value="EMEA">EMEA</option>
            <option value="APAC">APAC</option>
          </Select>
        </Field>
        <Field label="Booth Size">
          <Select
            value={formData.boothSize || ''}
            onChange={(_, data) => updateField('boothSize', data.value as BoothSize)}
          >
            <option value="">Select...</option>
            <option value="10 x 10">10 x 10</option>
            <option value="10 x 20">10 x 20</option>
            <option value="20 x 20">20 x 20</option>
            <option value="20 x 30">20 x 30</option>
            <option value="30 x 30">30 x 30</option>
            <option value="No Booth">No Booth (Table Top)</option>
            <option value="Partner Booth">Partner Booth</option>
          </Select>
        </Field>
      </div>

      <div className={styles.row}>
        <Field label="Start Date" required>
          <Input
            type="date"
            value={formData.startDate || ''}
            onChange={(_, data) => updateField('startDate', data.value)}
          />
        </Field>
        <Field label="End Date">
          <Input
            type="date"
            value={formData.endDate || ''}
            onChange={(_, data) => updateField('endDate', data.value)}
          />
        </Field>
      </div>

      <div className={styles.row}>
        <Field label="Tradeshow Owner">
          <Input
            value={formData.tradeshowOwner || ''}
            onChange={(_, data) => updateField('tradeshowOwner', data.value)}
          />
        </Field>
        <Field label="BU Owner">
          <Input
            value={formData.buOwner || ''}
            onChange={(_, data) => updateField('buOwner', data.value)}
          />
        </Field>
      </div>

      <Field label="Team Members">
        <Select
          multiple
          value={formData.teamMembers || []}
          onChange={(_, data) => updateField('teamMembers', Array.isArray(data.value) ? data.value : [data.value])}
        >
          {TEAM_MEMBERS.map((member) => (
            <option key={member} value={member}>{member}</option>
          ))}
        </Select>
      </Field>

      <Field label="Display Type">
        <Select
          value={formData.displayType || ''}
          onChange={(_, data) => updateField('displayType', data.value)}
        >
          <option value="">Select...</option>
          <option value="Table Top">Table Top</option>
          <option value="Booth 10x10">Booth 10x10</option>
          <option value="Booth 10x20">Booth 10x20</option>
          <option value="Booth 20x20">Booth 20x20</option>
          <option value="Booth 20x30">Booth 20x30</option>
          <option value="4-Post Rack">4-Post Rack</option>
          <option value="Demo Kit">Demo Kit</option>
          <option value="Tower">Tower</option>
          <option value="Virtual">Virtual</option>
        </Select>
      </Field>

      <div className={styles.row}>
        <Field label="Speaker Opportunity Deadline">
          <Input
            type="date"
            value={formData.speakerDeadline || ''}
            onChange={(_, data) => updateField('speakerDeadline', data.value)}
          />
        </Field>
        <Field label="Budget">
          <Input
            type="number"
            value={String(formData.budget || '')}
            onChange={(_, data) => updateField('budget', Number(data.value) || undefined)}
          />
        </Field>
      </div>

      <Field label="Who is Traveling?">
        <Textarea
          value={formData.travelDetails || ''}
          onChange={(_, data) => updateField('travelDetails', data.value)}
          rows={2}
        />
      </Field>

      <Field label="Show Notes">
        <Textarea
          value={formData.showNotes || ''}
          onChange={(_, data) => updateField('showNotes', data.value)}
          rows={3}
        />
      </Field>

      <div className={styles.actions}>
        <Button appearance="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button appearance="primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
};
