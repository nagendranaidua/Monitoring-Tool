import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  Skeleton,
  Stack,
  Tooltip,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DnsIcon from '@mui/icons-material/Dns';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import StorageIcon from '@mui/icons-material/Storage';
import { useSnackbar } from 'notistack';

import { useAuth } from '../context/AuthContext';
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../api/endpoints';
import ConfirmDialog from '../components/common/ConfirmDialog';

const EMPTY_FORM = {
  name: '',
  description: '',
  eurekaUrl: '',
  eurekaEnabled: false,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchApps = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getApplications();
      setApps(res.data);
    } catch (err) {
      enqueueSnackbar('Failed to load applications', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const openAddDialog = () => {
    setEditingApp(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (app, e) => {
    e.stopPropagation();
    setEditingApp(app);
    setForm({
      name: app.name || '',
      description: app.description || '',
      eurekaUrl: app.eurekaUrl || '',
      eurekaEnabled: !!app.eurekaEnabled,
    });
    setDialogOpen(true);
  };

  const handleChange = (field) => (e) => {
    const value = field === 'eurekaEnabled' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      enqueueSnackbar('Application name is required', { variant: 'warning' });
      return;
    }
    try {
      setSaving(true);
      if (editingApp) {
        await updateApplication(editingApp.id, form);
        enqueueSnackbar('Application updated', { variant: 'success' });
      } else {
        await createApplication(form);
        enqueueSnackbar('Application created', { variant: 'success' });
      }
      setDialogOpen(false);
      fetchApps();
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message || 'Failed to save application',
        { variant: 'error' }
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteApplication(deleteTarget.id);
      enqueueSnackbar('Application deleted', { variant: 'success' });
      setDeleteTarget(null);
      fetchApps();
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message || 'Failed to delete application',
        { variant: 'error' }
      );
    }
  };

  // ---------- Render ----------

  const renderSkeletons = () => (
    <Grid container spacing={3}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Grid item xs={12} sm={6} md={4} key={i}>
          <Card sx={{ p: 2 }}>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="90%" height={20} />
            <Skeleton variant="rectangular" height={40} sx={{ mt: 2, borderRadius: 1 }} />
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderEmpty = () => (
    <Box
      sx={{
        textAlign: 'center',
        py: 10,
      }}
    >
      <StorageIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
      <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
        No applications yet
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
        {isAdmin
          ? 'Click the + button to add your first application.'
          : 'No applications have been configured.'}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 3, position: 'relative', minHeight: '80vh' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Applications
      </Typography>

      {loading ? (
        renderSkeletons()
      ) : apps.length === 0 ? (
        renderEmpty()
      ) : (
        <Grid container spacing={3}>
          {apps.map((app) => (
            <Grid item xs={12} sm={6} md={4} key={app.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
                elevation={2}
                onClick={() => navigate(`/apps/${app.id}`)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="h6" fontWeight={700} noWrap>
                      {app.name}
                    </Typography>
                    <Tooltip
                      title={
                        app.eurekaEnabled
                          ? 'Eureka enabled'
                          : 'Eureka not configured'
                      }
                    >
                      <FiberManualRecordIcon
                        sx={{
                          fontSize: 14,
                          color: app.eurekaEnabled ? '#4caf50' : '#bdbdbd',
                        }}
                      />
                    </Tooltip>
                  </Stack>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: 40,
                    }}
                  >
                    {app.description || 'No description'}
                  </Typography>

                  <Stack direction="row" spacing={1}>
                    <Chip
                      icon={<DnsIcon />}
                      label={`${app.serverCount ?? 0} Servers`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      icon={<MiscellaneousServicesIcon />}
                      label={`${app.serviceCount ?? 0} Services`}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 1.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/apps/${app.id}`);
                    }}
                  >
                    View Details
                  </Button>

                  {isAdmin && (
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        onClick={(e) => openEditDialog(app, e)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(app);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* FAB for adding application */}
      {isAdmin && (
        <Fab
          color="primary"
          aria-label="Add Application"
          onClick={openAddDialog}
          sx={{ position: 'fixed', bottom: 32, right: 32 }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingApp ? 'Edit Application' : 'Add Application'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={handleChange('name')}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={handleChange('description')}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Eureka URL"
              value={form.eurekaUrl}
              onChange={handleChange('eurekaUrl')}
              fullWidth
              placeholder="http://eureka-server:8761/eureka"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.eurekaEnabled}
                  onChange={handleChange('eurekaEnabled')}
                />
              }
              label="Enable Eureka Integration"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
          >
            {saving ? 'Saving...' : editingApp ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Application"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will remove all associated servers, services, and allocations.`}
        confirmText="Delete"
        severity="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
