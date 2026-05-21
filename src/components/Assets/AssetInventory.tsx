import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
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
  Input,
  Select,
  Field,
  ProgressBar,
} from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';
import { useAssets } from '../../hooks/useAssets';
import { Asset, AssetCategory } from '../../types';

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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalM,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalL,
  },
  availabilityBar: {
    width: '100px',
  },
});

const ASSET_CATEGORIES: AssetCategory[] = [
  'Mobile Demo', 'Full Demo', 'Rack Display', 'Banner', 'Kiosk',
  'Backdrop', 'Bannerstand', 'Tower', 'Pelican Box', 'Inline',
  'Hands-on Kit', '4-Post Rack',
];

interface AssetInventoryProps {
  siteId: string;
}

export const AssetInventory: React.FC<AssetInventoryProps> = ({ siteId }) => {
  const styles = useStyles();
  const { assets, reservations, loading, addAsset, editAsset, removeAsset } = useAssets(siteId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({ totalQuantity: 1 });

  const getReservedCount = (assetId: string) => {
    return reservations
      .filter((r) => r.assetId === assetId && r.status !== 'Returned' && r.status !== 'Cancelled')
      .reduce((sum, r) => sum + r.quantity, 0);
  };

  const handleAddAsset = async () => {
    if (!newAsset.title || !newAsset.partNumber) return;
    await addAsset({
      title: newAsset.title,
      partNumber: newAsset.partNumber,
      category: newAsset.category || 'Mobile Demo',
      totalQuantity: newAsset.totalQuantity || 1,
      location: newAsset.location,
      notes: newAsset.notes,
    });
    setNewAsset({ totalQuantity: 1 });
    setIsFormOpen(false);
  };

  return (
    <div className={styles.container}>
      <Text size={600} weight="bold">Asset Inventory & Reservations</Text>

      <div className={styles.toolbar}>
        <Dialog open={isFormOpen} onOpenChange={(_, data) => setIsFormOpen(data.open)}>
          <DialogTrigger>
            <Button appearance="primary" icon={<Add24Regular />}>
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Add New Asset</DialogTitle>
              <DialogContent>
                <div className={styles.form}>
                  <Field label="Asset Name" required>
                    <Input
                      value={newAsset.title || ''}
                      onChange={(_, data) => setNewAsset((p) => ({ ...p, title: data.value }))}
                    />
                  </Field>
                  <Field label="Part Number" required>
                    <Input
                      value={newAsset.partNumber || ''}
                      onChange={(_, data) => setNewAsset((p) => ({ ...p, partNumber: data.value }))}
                    />
                  </Field>
                  <Field label="Category">
                    <Select
                      value={newAsset.category || ''}
                      onChange={(_, data) => setNewAsset((p) => ({ ...p, category: data.value as AssetCategory }))}
                    >
                      {ASSET_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Total Quantity">
                    <Input
                      type="number"
                      value={String(newAsset.totalQuantity || 1)}
                      onChange={(_, data) => setNewAsset((p) => ({ ...p, totalQuantity: Number(data.value) }))}
                    />
                  </Field>
                  <Field label="Location">
                    <Input
                      value={newAsset.location || ''}
                      onChange={(_, data) => setNewAsset((p) => ({ ...p, location: data.value }))}
                    />
                  </Field>
                  <div className={styles.actions}>
                    <Button appearance="secondary" onClick={() => setIsFormOpen(false)}>
                      Cancel
                    </Button>
                    <Button appearance="primary" onClick={handleAddAsset}>
                      Add Asset
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </div>

      {loading ? (
        <Text>Loading assets...</Text>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Asset Name</TableHeaderCell>
              <TableHeaderCell>Part Number</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Total</TableHeaderCell>
              <TableHeaderCell>Reserved</TableHeaderCell>
              <TableHeaderCell>Available</TableHeaderCell>
              <TableHeaderCell>Availability</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => {
              const reserved = getReservedCount(asset.id);
              const available = asset.totalQuantity - reserved;
              const availPct = asset.totalQuantity > 0 ? available / asset.totalQuantity : 0;

              return (
                <TableRow key={asset.id}>
                  <TableCell>
                    <Text weight="semibold">{asset.title}</Text>
                  </TableCell>
                  <TableCell>{asset.partNumber}</TableCell>
                  <TableCell>
                    <Badge appearance="outline">{asset.category}</Badge>
                  </TableCell>
                  <TableCell>{asset.totalQuantity}</TableCell>
                  <TableCell>{reserved}</TableCell>
                  <TableCell>
                    <Badge
                      appearance="filled"
                      color={available > 0 ? 'success' : 'danger'}
                    >
                      {available}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ProgressBar
                      className={styles.availabilityBar}
                      value={availPct}
                      color={availPct > 0.5 ? 'success' : availPct > 0 ? 'warning' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="small" appearance="subtle">Reserve</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
