import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Skeleton,
  Stack,
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  AlertTitle,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import RestoreIcon from '@mui/icons-material/Restore';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  getApplications,
  getSnapshots,
  createSnapshot,
  restoreSnapshot,
  getSnapshotDiff,
} from '../api/endpoints';

export default function Snapshots() {
  const { isAdmin, isOperator } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Data
  const [apps, setApps] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [snapshots, setSnapshots] = useState([]);

  // UI
  const [appsLoading, setAppsLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  // Diff drawer
  const [diffDrawerOpen, setDiffDrawerOpen] = useState(false);
  const [diffData, setDiffData] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffSnapshotName, setDiffSnapshotName] = useState('');

  // Restore
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);

  // ─── Fetch ─────────────────────────────────────────────────────────────

  const fetchApps = useCallback(async () => {
    try {
      setAppsLoading(true);
      const res = await getApplications();
      setApps(res.data);
    } catch {
      enqueueSnackbar('Failed to load applications', { variant: 'error' });
    } finally {
      setAppsLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const fetchSnapshots = useCallback(async () => {
    if (!selectedAppId) return;
    try {
      setLoading(true);
      const res = await getSnapshots(selectedAppId);
      const sorted = (res.data || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setSnapshots(sorted);
    } catch {
      enqueueSnackbar('Failed to load snapshots', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedAppId, enqueueSnackbar]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      enqueueSnackbar('Snapshot name is required', { variant: 'warning' });
      return;
    }
    try {
      setCreating(true);
      await createSnapshot({
        applicationId: Number(selectedAppId),
        name: createForm.name,
        description: createForm.description,
      });
      enqueueSnackbar('Snapshot created', { variant: 'success' });
      setCreateOpen(false);
      setCreateForm({ name: '', description: '' });
      fetchSnapshots();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create snapshot', {
        variant: 'error',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleViewDiff = async (snapshot) => {
    try {
      setDiffLoading(true);
      setDiffDrawerOpen(true);
      setDiffData(null);
      setDiffSnapshotName(snapshot.name);
      const res = await getSnapshotDiff(snapshot.id);
      setDiffData(res.data);
    } catch {
      enqueueSnackbar('Failed to load diff', { variant: 'error' });
      setDiffDrawerOpen(false);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      setRestoring(true);
      await restoreSnapshot(restoreTarget.id);
      enqueueSnackbar('Snapshot restored successfully', { variant: 'success' });
      setRestoreTarget(null);
      fetchSnapshots();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to restore snapshot', {
        variant: 'error',
      });
    } finally {
      setRestoring(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return dateStr;
    }
  };

  const isAutoSnapshot = (snap) =>
    snap.name?.startsWith('Auto:') || snap.triggerReason;

  // ─── Render ────────────────────────────────────────────────────────────

  const renderSkeletons = () => (
    <Stack spacing={2}>
      {[1, 2, 3].map((i) => (
        <Card key={i} sx={{ p: 2 }}>
          <Skeleton variant="text" width="40%" height={28} />
          <Skeleton variant="text" width="70%" height={20} />
          <Skeleton variant="rectangular" height={40} sx={{ mt: 1, borderRadius: 1 }} />
        </Card>
      ))}
    </Stack>
  );

  const renderEmpty = () => (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <CameraAltIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
      <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
        {selectedAppId ? 'No snapshots found' : 'Select an application to view snapshots'}
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
        {selectedAppId
          ? 'Create a snapshot to save the current allocation state.'
          : 'Use the dropdown above to choose an application.'}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 3, minHeight: '80vh' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Snapshots
      </Typography>

      {/* Top bar */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          select
          label="Application"
          size="small"
          value={selectedAppId}
          onChange={(e) => setSelectedAppId(e.target.value)}
          sx={{ minWidth: 250 }}
          disabled={appsLoading}
        >
          <MenuItem value="">
            <em>Select an application</em>
          </MenuItem>
          {apps.map((app) => (
            <MenuItem key={app.id} value={app.id}>
              {app.name}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ flexGrow: 1 }} />

        {isOperator && selectedAppId && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Create Snapshot
          </Button>
        )}
      </Stack>

      {/* Snapshot list */}
      {loading ? (
        renderSkeletons()
      ) : !selectedAppId || snapshots.length === 0 ? (
        renderEmpty()
      ) : (
        <Stack spacing={2}>
          {snapshots.map((snap) => (
            <Card
              key={snap.id}
              elevation={2}
              sx={{
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 4 },
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <HistoryIcon color="action" />
                  <Typography variant="h6" fontWeight={600}>
                    {snap.name}
                  </Typography>
                  {isAutoSnapshot(snap) && (
                    <Chip
                      icon={<AutorenewIcon />}
                      label={snap.triggerReason || 'Auto'}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                </Stack>

                {snap.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {snap.description}
                  </Typography>
                )}

                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  <Typography variant="caption" color="text.disabled">
                    Created by: {snap.createdBy || 'System'}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Created at: {formatDate(snap.createdAt)}
                  </Typography>
                </Stack>
              </CardContent>

              <CardActions sx={{ px: 2, pb: 1.5 }}>
                <Button
                  size="small"
                  startIcon={<CompareArrowsIcon />}
                  onClick={() => handleViewDiff(snap)}
                >
                  View Diff
                </Button>
                {isOperator && (
                  <Button
                    size="small"
                    startIcon={<RestoreIcon />}
                    color="warning"
                    onClick={() => setRestoreTarget(snap)}
                  >
                    Restore
                  </Button>
                )}
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      {/* ═══════════════════ DIALOGS ═══════════════════ */}

      {/* Create Snapshot Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Snapshot</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Snapshot Name"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
              autoFocus
              placeholder="e.g., Before v2.5 deployment"
            />
            <TextField
              label="Description"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              placeholder="Optional notes about this snapshot..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diff Drawer */}
      <Drawer
        anchor="right"
        open={diffDrawerOpen}
        onClose={() => setDiffDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Snapshot Diff: {diffSnapshotName}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {diffLoading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Computing diff...
              </Typography>
            </Box>
          ) : diffData ? (
            <Stack spacing={3}>
              {/* To Add */}
              {(diffData.toAdd || []).length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#4caf50', mb: 1 }}>
                    To Add ({diffData.toAdd.length})
                  </Typography>
                  <List dense>
                    {diffData.toAdd.map((item, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <AddCircleOutlineIcon sx={{ color: '#4caf50' }} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.serviceName || item.description || JSON.stringify(item)}
                          secondary={item.serverName || item.serverAlias}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* To Remove */}
              {(diffData.toRemove || []).length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#f44336', mb: 1 }}>
                    To Remove ({diffData.toRemove.length})
                  </Typography>
                  <List dense>
                    {diffData.toRemove.map((item, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <RemoveCircleOutlineIcon sx={{ color: '#f44336' }} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.serviceName || item.description || JSON.stringify(item)}
                          secondary={item.serverName || item.serverAlias}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* To Modify */}
              {(diffData.toModify || []).length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1 }}>
                    To Modify ({diffData.toModify.length})
                  </Typography>
                  <List dense>
                    {diffData.toModify.map((item, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <EditIcon sx={{ color: '#ff9800' }} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.serviceName || item.description || JSON.stringify(item)}
                          secondary={
                            item.change ||
                            `${item.serverName || item.serverAlias || ''} - instances: ${item.oldCount ?? '?'} -> ${item.newCount ?? '?'}`
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {(diffData.toAdd || []).length === 0 &&
                (diffData.toRemove || []).length === 0 &&
                (diffData.toModify || []).length === 0 && (
                  <Alert severity="info">
                    <AlertTitle>No Differences</AlertTitle>
                    This snapshot matches the current state.
                  </Alert>
                )}
            </Stack>
          ) : (
            <Typography color="text.secondary">No diff data available</Typography>
          )}
        </Box>
      </Drawer>

      {/* Restore Confirmation */}
      <ConfirmDialog
        open={!!restoreTarget}
        title="Restore Snapshot"
        message={`This will stop/start services via SSH to match the snapshot "${restoreTarget?.name}". Continue?`}
        confirmText={restoring ? 'Restoring...' : 'Restore'}
        severity="warning"
        onConfirm={handleRestore}
        onCancel={() => !restoring && setRestoreTarget(null)}
      />
    </Box>
  );
}
