import React, { useState, useEffect } from 'react';
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
  Field,
  Switch,
} from '@fluentui/react-components';
import { Add24Regular, Delete24Regular } from '@fluentui/react-icons';
import { DropdownOption } from '../../types';
import { getDropdownOptions, createDropdownOption, deactivateDropdownOption } from '../../services/configService';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  addRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalM,
  },
});

const CATEGORIES = [
  'EventType',
  'BoothSize',
  'BoothProperty',
  'Region',
  'BUOwner',
  'DisplayType',
];

interface DropdownManagerProps {
  siteId: string;
}

export const DropdownManager: React.FC<DropdownManagerProps> = ({ siteId }) => {
  const styles = useStyles();
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('EventType');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const data = await getDropdownOptions(siteId, selectedCategory);
      setOptions(data);
    } catch {
      // Handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, [siteId, selectedCategory]);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    await createDropdownOption(siteId, {
      value: newValue.trim(),
      category: selectedCategory,
      sortOrder: options.length + 1,
      isActive: true,
    });
    setNewValue('');
    loadOptions();
  };

  const handleDeactivate = async (optionId: string) => {
    await deactivateDropdownOption(siteId, optionId);
    loadOptions();
  };

  return (
    <div className={styles.container}>
      <Text size={600} weight="bold">Admin - Dropdown Configuration</Text>
      <Text size={300}>
        Manage the picklist values used throughout the application. Changes apply immediately for all users.
      </Text>

      <Field label="Category">
        <Select
          value={selectedCategory}
          onChange={(_, data) => setSelectedCategory(data.value)}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Select>
      </Field>

      <div className={styles.addRow}>
        <Field label="New Option Value">
          <Input
            value={newValue}
            onChange={(_, data) => setNewValue(data.value)}
            placeholder="Enter new option value..."
          />
        </Field>
        <Button appearance="primary" icon={<Add24Regular />} onClick={handleAdd}>
          Add
        </Button>
      </div>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Value</TableHeaderCell>
              <TableHeaderCell>Sort Order</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {options.map((option) => (
              <TableRow key={option.id}>
                <TableCell>{option.value}</TableCell>
                <TableCell>{option.sortOrder}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<Delete24Regular />}
                    onClick={() => handleDeactivate(option.id)}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
