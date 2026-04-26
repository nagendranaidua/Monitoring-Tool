import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Stack,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  MenuItem,
  Skeleton,
  Alert,
  AlertTitle,
  Tooltip,
  Divider,
  LinearProgress,
  Paper,
  CircularProgress,
} from '@mui/material';
import { DataGrid, GridToolbarFilterButton } from '@mui/x-data-grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import { useSnackbar } from 'notistack';

import { useAuth } from '../context/AuthContext';
import StatusChip from '../components/common/StatusChip';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  getApplication,
  updateApplication,
  getServers,
  createServer,
  updateServer,
  deleteServer,
  healthCheck,
  getFilterOptions,
  getServices,
  createService,
  updateService,
  deleteService,
  getEurekaMismatches,
  syncEureka,
  discoverServicesFromEureka,
} from '../api/endpoints';

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_SERVER = {
  serverName: '',
  alias: '',
  ipAddress: '',
  environment: '',
  datacenter: '',
  zone: '',
  osType: '',
  osVersion: '',
  serverType: '',
  cpuCount: '',
  cpuCores: '',
  ramGb: '',
  diskSize: '',
  software: '',
  remarks: '',
  status: 'ACTIVE',
};

const EMPTY_SERVICE = {
  name: '',
  description: '',
  jarName: '',
  version: '',
  startScript: '',
  stopScript: '',
  healthCheckScript: '',
  eurekaServiceName: '',
  basePort: '',
};

const MISMATCH_CONFIG = {
  CONFIGURED_NOT_REGISTERED: {
    severity: 'warning',
    label: (m) =>
      `${m.serviceName} on ${m.serverName || 'a server'} is configured but NOT registered in Eureka`,
  },
  REGISTERED_NOT_CONFIGURED: {
    severity: 'info',
    label: (m) =>
      `${m.serviceName || m.eurekaServiceName} found in Eureka but not configured in this tool`,
  },
  INSTANCE_COUNT_MISMATCH: {
    severity: 'warning',
    label: (m) =>
      `Expected ${m.expectedCount} instance(s) of ${m.serviceName}, found ${m.actualCount} in Eureka`,
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ApplicationDetail() {
  const { id: appId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // App state
  const [app, setApp] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [editAppOpen, setEditAppOpen] = useState(false);
  const [appForm, setAppForm] = useState({ name: '', description: '', eurekaUrl: '', eurekaEnabled: false });
  const [savingApp, setSavingApp] = useState(false);

  // Tabs
  const [tab, setTab] = useState(0);

  // Servers state
  const [servers, setServers] = useState([]);
  const [serversLoading, setServersLoading] = useState(false);
  const [filterOptions, setFilterOptions] = useState({});
  const [quickFilters, setQuickFilters] = useState({
    environment: '',
    datacenter: '',
    zone: '',
    software: '',
  });
  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [serverForm, setServerForm] = useState(EMPTY_SERVER);
  const [savingServer, setSavingServer] = useState(false);
  const [deleteServerTarget, setDeleteServerTarget] = useState(null);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Services state
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE);
  const [savingService, setSavingService] = useState(false);
  const [deleteServiceTarget, setDeleteServiceTarget] = useState(null);

  // Eureka state
  const [mismatches, setMismatches] = useState([]);
  const [mismatchesLoading, setMismatchesLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [discovering, setDiscovering] = useState(false);

  // ─── Fetch Application ──────────────────────────────────────────────────

  const fetchApp = useCallback(async () => {
    try {
      setAppLoading(true);
      const res = await getApplication(appId);
      setApp(res.data);
    } catch {
      enqueueSnackbar('Failed to load application', { variant: 'error' });
    } finally {
      setAppLoading(false);
    }
  }, [appId, enqueueSnackbar]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  // ─── Fetch Servers ──────────────────────────────────────────────────────

  const fetchServers = useCallback(async () => {
    try {
      setServersLoading(true);
      const [srvRes, foRes] = await Promise.all([
        getServers(appId),
        getFilterOptions(appId),
      ]);
      setServers(srvRes.data);
      setFilterOptions(foRes.data);
    } catch {
      enqueueSnackbar('Failed to load servers', { variant: 'error' });
    } finally {
      setServersLoading(false);
    }
  }, [appId, enqueueSnackbar]);

  // ─── Fetch Services ────────────────────────────────────────────────────

  const fetchServices = useCallback(async () => {
    try {
      setServicesLoading(true);
      const res = await getServices(appId);
      setServices(res.data);
    } catch {
      enqueueSnackbar('Failed to load services', { variant: 'error' });
    } finally {
      setServicesLoading(false);
    }
  }, [appId, enqueueSnackbar]);

  // ─── Fetch Mismatches ──────────────────────────────────────────────────

  const fetchMismatches = useCallback(async () => {
    try {
      setMismatchesLoading(true);
      const res = await getEurekaMismatches(appId);
      setMismatches(res.data);
    } catch {
      enqueueSnackbar('Failed to load Eureka mismatches', { variant: 'error' });
    } finally {
      setMismatchesLoading(false);
    }
  }, [appId, enqueueSnackbar]);

  // Load tab data on tab change
  useEffect(() => {
    if (tab === 0) fetchServers();
    else if (tab === 1) fetchServices();
    else if (tab === 2 && app?.eurekaEnabled) fetchMismatches();
  }, [tab, fetchServers, fetchServices, fetchMismatches, app?.eurekaEnabled]);

  // ─── Application Edit ──────────────────────────────────────────────────

  const openEditApp = () => {
    setAppForm({
      name: app.name || '',
      description: app.description || '',
      eurekaUrl: app.eurekaUrl || '',
      eurekaEnabled: !!app.eurekaEnabled,
    });
    setEditAppOpen(true);
  };

  const handleSaveApp = async () => {
    try {
      setSavingApp(true);
      await updateApplication(appId, appForm);
      enqueueSnackbar('Application updated', { variant: 'success' });
      setEditAppOpen(false);
      fetchApp();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to update application', {
        variant: 'error',
      });
    } finally {
      setSavingApp(false);
    }
  };

  // ─── Server CRUD ───────────────────────────────────────────────────────

  const openAddServer = () => {
    setEditingServer(null);
    setServerForm(EMPTY_SERVER);
    setServerDialogOpen(true);
  };

  const openEditServer = (server, e) => {
    e.stopPropagation();
    setEditingServer(server);
    setServerForm({
      serverName: server.serverName || '',
      alias: server.alias || '',
      ipAddress: server.ipAddress || '',
      environment: server.environment || '',
      datacenter: server.datacenter || '',
      zone: server.zone || '',
      osType: server.osType || '',
      osVersion: server.osVersion || '',
      serverType: server.serverType || '',
      cpuCount: server.cpuCount ?? '',
      cpuCores: server.cpuCores ?? '',
      ramGb: server.ramGb ?? '',
      diskSize: server.diskSize || '',
      software: server.software || '',
      remarks: server.remarks || '',
      status: server.status || 'ACTIVE',
    });
    setServerDialogOpen(true);
  };

  const handleSaveServer = async () => {
    if (!serverForm.serverName.trim()) {
      enqueueSnackbar('Server name is required', { variant: 'warning' });
      return;
    }
    try {
      setSavingServer(true);
      const payload = {
        ...serverForm,
        cpuCount: serverForm.cpuCount ? Number(serverForm.cpuCount) : null,
        cpuCores: serverForm.cpuCores ? Number(serverForm.cpuCores) : null,
        ramGb: serverForm.ramGb ? Number(serverForm.ramGb) : null,
      };
      if (editingServer) {
        await updateServer(editingServer.id, payload);
        enqueueSnackbar('Server updated', { variant: 'success' });
      } else {
        await createServer(appId, payload);
        enqueueSnackbar('Server created', { variant: 'success' });
      }
      setServerDialogOpen(false);
      fetchServers();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save server', {
        variant: 'error',
      });
    } finally {
      setSavingServer(false);
    }
  };

  const handleDeleteServer = async () => {
    if (!deleteServerTarget) return;
    try {
      await deleteServer(deleteServerTarget.id);
      enqueueSnackbar('Server deleted', { variant: 'success' });
      setDeleteServerTarget(null);
      fetchServers();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete server', {
        variant: 'error',
      });
    }
  };

  const handleHealthCheck = async (serverId, e) => {
    e.stopPropagation();
    try {
      setHealthLoading(true);
      setHealthDialogOpen(true);
      setHealthData(null);
      const res = await healthCheck(serverId);
      setHealthData(res.data);
    } catch {
      enqueueSnackbar('Health check failed', { variant: 'error' });
      setHealthDialogOpen(false);
    } finally {
      setHealthLoading(false);
    }
  };

  // ─── Service CRUD ──────────────────────────────────────────────────────

  const openAddService = () => {
    setEditingService(null);
    setServiceForm(EMPTY_SERVICE);
    setServiceDialogOpen(true);
  };

  const openEditService = (svc, e) => {
    e.stopPropagation();
    setEditingService(svc);
    setServiceForm({
      name: svc.name || '',
      description: svc.description || '',
      jarName: svc.jarName || '',
      version: svc.version || '',
      startScript: svc.startScript || '',
      stopScript: svc.stopScript || '',
      healthCheckScript: svc.healthCheckScript || '',
      eurekaServiceName: svc.eurekaServiceName || '',
      basePort: svc.basePort ?? '',
    });
    setServiceDialogOpen(true);
  };

  const handleSaveService = async () => {
    if (!serviceForm.name.trim()) {
      enqueueSnackbar('Service name is required', { variant: 'warning' });
      return;
    }
    try {
      setSavingService(true);
      const payload = {
        ...serviceForm,
        applicationId: Number(appId),
        basePort: serviceForm.basePort ? Number(serviceForm.basePort) : null,
      };
      if (editingService) {
        await updateService(editingService.id, payload);
        enqueueSnackbar('Service updated', { variant: 'success' });
      } else {
        await createService(payload);
        enqueueSnackbar('Service created', { variant: 'success' });
      }
      setServiceDialogOpen(false);
      fetchServices();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save service', {
        variant: 'error',
      });
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = async () => {
    if (!deleteServiceTarget) return;
    try {
      await deleteService(deleteServiceTarget.id);
      enqueueSnackbar('Service deleted', { variant: 'success' });
      setDeleteServiceTarget(null);
      fetchServices();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete service', {
        variant: 'error',
      });
    }
  };

  // ─── Eureka Sync ───────────────────────────────────────────────────────

  const handleSync = async () => {
    try {
      setSyncing(true);
      await syncEureka(appId);
      enqueueSnackbar('Eureka sync completed', { variant: 'success' });
      fetchMismatches();
    } catch {
      enqueueSnackbar('Eureka sync failed', { variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  // ─── Discover from Eureka ────────────────────────────────────────────

  const handleDiscoverFromEureka = async () => {
    try {
      setDiscovering(true);
      const res = await discoverServicesFromEureka(appId);
      const { importedCount, importedServices } = res.data;
      if (importedCount === 0) {
        enqueueSnackbar('No new services found in Eureka registry. All services are already configured.', {
          variant: 'info',
        });
      } else {
        enqueueSnackbar(
          `Discovered and imported ${importedCount} service(s) from Eureka: ${importedServices.join(', ')}`,
          { variant: 'success' }
        );
        fetchServices();
      }
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message || 'Failed to discover services from Eureka. Check the Eureka URL configuration.',
        { variant: 'error' }
      );
    } finally {
      setDiscovering(false);
    }
  };

  // ─── Filtered Servers ──────────────────────────────────────────────────

  const filteredServers = servers.filter((s) => {
    if (quickFilters.environment && s.environment !== quickFilters.environment) return false;
    if (quickFilters.datacenter && s.datacenter !== quickFilters.datacenter) return false;
    if (quickFilters.zone && s.zone !== quickFilters.zone) return false;
    if (quickFilters.software && s.software !== quickFilters.software) return false;
    return true;
  });

  // ─── DataGrid Columns ─────────────────────────────────────────────────

  const serverColumns = [
    { field: 'serverName', headerName: 'Server Name', flex: 1, minWidth: 140, filterable: true },
    { field: 'alias', headerName: 'Alias', flex: 0.8, minWidth: 110, filterable: true },
    { field: 'ipAddress', headerName: 'IP Address', flex: 0.9, minWidth: 130, filterable: true },
    { field: 'environment', headerName: 'Environment', flex: 0.7, minWidth: 110, filterable: true },
    { field: 'zone', headerName: 'Zone', flex: 0.5, minWidth: 70, filterable: true },
    { field: 'datacenter', headerName: 'Data Center', flex: 0.7, minWidth: 110, filterable: true },
    { field: 'osType', headerName: 'OS Type', flex: 0.5, minWidth: 80, filterable: true },
    { field: 'osVersion', headerName: 'OS Version', flex: 0.6, minWidth: 90, filterable: true },
    { field: 'serverType', headerName: 'Server Type', flex: 0.6, minWidth: 90, filterable: true },
    { field: 'cpuCount', headerName: 'CPU Count', flex: 0.4, minWidth: 70, type: 'number', filterable: true },
    { field: 'cpuCores', headerName: 'CPU Cores', flex: 0.4, minWidth: 70, type: 'number', filterable: true },
    { field: 'ramGb', headerName: 'RAM (GB)', flex: 0.5, minWidth: 80, type: 'number', filterable: true },
    { field: 'diskSize', headerName: 'Disk Size', flex: 0.5, minWidth: 80, filterable: true },
    { field: 'software', headerName: 'Software', flex: 0.7, minWidth: 100, filterable: true },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.6,
      minWidth: 100,
      filterable: true,
      renderCell: (params) => <StatusChip status={params.value} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.9,
      minWidth: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          {isAdmin && (
            <IconButton size="small" onClick={(e) => openEditServer(params.row, e)}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          <Tooltip title="Health Check">
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => handleHealthCheck(params.row.id, e)}
            >
              <MonitorHeartIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {isAdmin && (
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteServerTarget(params.row);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      ),
    },
  ];

  // ─── Render: Loading App ───────────────────────────────────────────────

  if (appLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton width={200} height={40} />
        <Skeleton width={400} height={24} sx={{ mt: 1 }} />
        <Skeleton variant="rectangular" height={400} sx={{ mt: 3, borderRadius: 1 }} />
      </Box>
    );
  }

  if (!app) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 6 }}>
        <Typography variant="h5" color="text.secondary">
          Application not found
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  // ─── Main Render ───────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
        <IconButton onClick={() => navigate('/')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            {app.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {app.description || 'No description'}
          </Typography>
        </Box>
        {isAdmin && (
          <Button startIcon={<EditIcon />} variant="outlined" onClick={openEditApp}>
            Edit
          </Button>
        )}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Servers" />
        <Tab label="Services" />
        {app.eurekaEnabled && <Tab label="Eureka Sync" />}
      </Tabs>

      {/* ──────── Servers Tab ──────── */}
      {tab === 0 && (
        <Box>
          {/* Quick filters + Add button */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <TextField
              select
              label="Environment"
              size="small"
              value={quickFilters.environment}
              onChange={(e) => setQuickFilters((f) => ({ ...f, environment: e.target.value }))}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All</MenuItem>
              {(filterOptions.environment || []).map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Datacenter"
              size="small"
              value={quickFilters.datacenter}
              onChange={(e) => setQuickFilters((f) => ({ ...f, datacenter: e.target.value }))}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All</MenuItem>
              {(filterOptions.datacenter || []).map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Zone"
              size="small"
              value={quickFilters.zone}
              onChange={(e) =>
                setQuickFilters((f) => ({ ...f, zone: e.target.value }))
              }
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All</MenuItem>
              {(filterOptions.zone || []).map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Software"
              size="small"
              value={quickFilters.software}
              onChange={(e) => setQuickFilters((f) => ({ ...f, software: e.target.value }))}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All</MenuItem>
              {(filterOptions.software || []).map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ flexGrow: 1 }} />

            {isAdmin && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAddServer}>
                Add Server
              </Button>
            )}
          </Stack>

          {/* DataGrid */}
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={filteredServers}
              columns={serverColumns}
              loading={serversLoading}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              disableRowSelectionOnClick
              onRowClick={(params) => navigate(`/apps/${appId}/servers/${params.row.id}`)}
              sx={{
                cursor: 'pointer',
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
              slots={{
                toolbar: () => (
                  <Box sx={{ px: 1, py: 0.5 }}>
                    <GridToolbarFilterButton />
                  </Box>
                ),
              }}
            />
          </Box>
        </Box>
      )}

      {/* ──────── Services Tab ──────── */}
      {tab === 1 && (
        <Box>
          {services.length > 0 && (
            <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 2 }}>
              {isAdmin && app?.eurekaEnabled && (
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={discovering ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
                  onClick={handleDiscoverFromEureka}
                  disabled={discovering}
                  size="small"
                >
                  {discovering ? 'Discovering...' : 'Import from Eureka'}
                </Button>
              )}
              {isAdmin && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={openAddService}>
                  Add Service
                </Button>
              )}
            </Stack>
          )}

          {servicesLoading ? (
            <Grid container spacing={3}>
              {[1, 2, 3].map((i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Card sx={{ p: 2 }}>
                    <Skeleton variant="text" width="50%" height={28} />
                    <Skeleton variant="text" width="80%" height={20} />
                    <Skeleton variant="rectangular" height={60} sx={{ mt: 1, borderRadius: 1 }} />
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : services.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                textAlign: 'center',
                py: 8,
                px: 4,
                borderStyle: 'dashed',
                borderColor: 'divider',
                backgroundColor: 'action.hover',
                borderRadius: 3,
              }}
            >
              <MiscellaneousServicesIcon sx={{ fontSize: 72, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h5" color="text.secondary" gutterBottom>
                No services configured yet
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 520, mx: 'auto' }}>
                You can register services manually, import them from your Eureka service registry,
                or upload an infrastructure Excel sheet in the Imports section.
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="center"
                alignItems="center"
              >
                {/* Option 1: Add manually */}
                {isAdmin && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openAddService}
                    size="large"
                  >
                    Add Service Manually
                  </Button>
                )}

                {/* Option 2: Discover from Eureka (only if app has Eureka configured) */}
                {isAdmin && app?.eurekaEnabled && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={discovering ? <CircularProgress size={18} /> : <CloudDownloadIcon />}
                    onClick={handleDiscoverFromEureka}
                    disabled={discovering}
                    size="large"
                  >
                    {discovering ? 'Discovering...' : 'Import from Eureka'}
                  </Button>
                )}

                {/* Option 3: Go to Excel import */}
                {isAdmin && (
                  <Button
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                    onClick={() => navigate('/import')}
                    size="large"
                  >
                    Upload Excel
                  </Button>
                )}
              </Stack>

              {/* Eureka hint if not configured */}
              {app && !app.eurekaEnabled && (
                <Box
                  sx={{
                    mt: 4,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: 'info.main',
                    color: 'info.contrastText',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    maxWidth: 560,
                  }}
                >
                  <InfoOutlinedIcon fontSize="small" />
                  <Typography variant="body2">
                    <strong>Tip:</strong> Configure a Eureka URL for this application to auto-discover registered services.
                    Edit the application from the Dashboard to add the Eureka endpoint.
                  </Typography>
                </Box>
              )}
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {services.map((svc) => (
                <Grid item xs={12} sm={6} md={4} key={svc.id}>
                  <Card
                    elevation={2}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': { transform: 'translateY(-3px)', boxShadow: 5 },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" fontWeight={700} noWrap>
                          {svc.name}
                        </Typography>
                        {svc.version && (
                          <Chip label={`v${svc.version}`} size="small" color="primary" variant="outlined" />
                        )}
                      </Stack>

                      {svc.jarName && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {svc.jarName}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                        {svc.basePort && (
                          <Chip
                            label={`Port ${svc.basePort}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {svc.eurekaServiceName && (
                          <Chip
                            label={svc.eurekaServiceName}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        )}
                      </Stack>

                      <Chip
                        label={`Running on ${svc.allocationCount ?? 0} server(s)`}
                        size="small"
                        sx={{ mt: 1.5 }}
                        color="info"
                        variant="filled"
                      />
                    </CardContent>

                    {isAdmin && (
                      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1.5 }}>
                        <IconButton size="small" onClick={(e) => openEditService(svc, e)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteServiceTarget(svc);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </CardActions>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* ──────── Eureka Sync Tab ──────── */}
      {tab === 2 && app.eurekaEnabled && (
        <Box>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<SyncIcon />}
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync Status'}
            </Button>
          </Stack>

          {mismatchesLoading || syncing ? (
            <LinearProgress sx={{ mb: 2 }} />
          ) : mismatches.length === 0 ? (
            <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />} sx={{ mb: 2 }}>
              <AlertTitle>All in Sync</AlertTitle>
              All services are in sync with Eureka.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {mismatches.map((m, idx) => {
                const cfg = MISMATCH_CONFIG[m.type] || MISMATCH_CONFIG.CONFIGURED_NOT_REGISTERED;
                return (
                  <Alert key={idx} severity={cfg.severity}>
                    <AlertTitle>{(m.type || '').replace(/_/g, ' ')}</AlertTitle>
                    {cfg.label(m)}
                    {m.suggestion && (
                      <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                        Suggestion: {m.suggestion}
                      </Typography>
                    )}
                  </Alert>
                );
              })}
            </Stack>
          )}
        </Box>
      )}

      {/* ═══════════════════ DIALOGS ═══════════════════ */}

      {/* Edit Application Dialog */}
      <Dialog open={editAppOpen} onClose={() => setEditAppOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Application</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={appForm.name}
              onChange={(e) => setAppForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={appForm.description}
              onChange={(e) => setAppForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Eureka URL"
              value={appForm.eurekaUrl}
              onChange={(e) => setAppForm((f) => ({ ...f, eurekaUrl: e.target.value }))}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={appForm.eurekaEnabled}
                  onChange={(e) => setAppForm((f) => ({ ...f, eurekaEnabled: e.target.checked }))}
                />
              }
              label="Enable Eureka Integration"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAppOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveApp} variant="contained" disabled={savingApp}>
            {savingApp ? 'Saving...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add / Edit Server Dialog */}
      <Dialog
        open={serverDialogOpen}
        onClose={() => setServerDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{editingServer ? 'Edit Server' : 'Add Server'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[
              { key: 'serverName', label: 'Server Name', required: true },
              { key: 'alias', label: 'Alias' },
              { key: 'ipAddress', label: 'IP Address' },
              { key: 'environment', label: 'Environment' },
              { key: 'datacenter', label: 'Data Center' },
              { key: 'zone', label: 'Zone' },
              { key: 'osType', label: 'OS Type' },
              { key: 'osVersion', label: 'OS Version' },
              { key: 'serverType', label: 'Server Type' },
              { key: 'cpuCount', label: 'CPU Count', type: 'number' },
              { key: 'cpuCores', label: 'CPU Cores', type: 'number' },
              { key: 'ramGb', label: 'RAM (GB)', type: 'number' },
              { key: 'diskSize', label: 'Disk Size' },
              { key: 'software', label: 'Software' },
              { key: 'remarks', label: 'Remarks' },
            ].map(({ key, label, required, type }) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <TextField
                  label={label}
                  value={serverForm[key]}
                  onChange={(e) => setServerForm((f) => ({ ...f, [key]: e.target.value }))}
                  required={required}
                  fullWidth
                  type={type || 'text'}
                  size="small"
                />
              </Grid>
            ))}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                label="Status"
                value={serverForm.status}
                onChange={(e) => setServerForm((f) => ({ ...f, status: e.target.value }))}
                fullWidth
                size="small"
              >
                {['ACTIVE', 'INACTIVE', 'PLANNED', 'DOWN'].map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServerDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveServer} variant="contained" disabled={savingServer}>
            {savingServer ? 'Saving...' : editingServer ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add / Edit Service Dialog */}
      <Dialog
        open={serviceDialogOpen}
        onClose={() => setServiceDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[
              { key: 'name', label: 'Name', required: true },
              { key: 'description', label: 'Description' },
              { key: 'jarName', label: 'JAR Name' },
              { key: 'version', label: 'Version' },
              { key: 'eurekaServiceName', label: 'Eureka Service Name' },
              { key: 'basePort', label: 'Base Port', type: 'number' },
            ].map(({ key, label, required, type }) => (
              <Grid item xs={12} sm={6} key={key}>
                <TextField
                  label={label}
                  value={serviceForm[key]}
                  onChange={(e) => setServiceForm((f) => ({ ...f, [key]: e.target.value }))}
                  required={required}
                  fullWidth
                  type={type || 'text'}
                  size="small"
                />
              </Grid>
            ))}
            {[
              { key: 'startScript', label: 'Start Script' },
              { key: 'stopScript', label: 'Stop Script' },
              { key: 'healthCheckScript', label: 'Health Check Script' },
            ].map(({ key, label }) => (
              <Grid item xs={12} key={key}>
                <TextField
                  label={label}
                  value={serviceForm[key]}
                  onChange={(e) => setServiceForm((f) => ({ ...f, [key]: e.target.value }))}
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServiceDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveService} variant="contained" disabled={savingService}>
            {savingService ? 'Saving...' : editingService ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Health Check Results Dialog */}
      <Dialog
        open={healthDialogOpen}
        onClose={() => setHealthDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Health Check Results</DialogTitle>
        <DialogContent>
          {healthLoading ? (
            <Box sx={{ py: 4 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                Running health check...
              </Typography>
            </Box>
          ) : healthData ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity={healthData.reachable ? 'success' : 'error'}>
                {healthData.reachable ? 'Server is reachable' : 'Server is unreachable'}
              </Alert>

              {healthData.reachable && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <MemoryIcon color="primary" />
                      <Typography variant="h6">{healthData.cpuUsage ?? '--'}%</Typography>
                      <Typography variant="caption" color="text.secondary">
                        CPU Usage
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <SpeedIcon color="primary" />
                      <Typography variant="h6">{healthData.ramUsage ?? '--'}%</Typography>
                      <Typography variant="caption" color="text.secondary">
                        RAM Usage
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <StorageIcon color="primary" />
                      <Typography variant="h6">{healthData.diskUsage ?? '--'}%</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Disk Usage
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <AccessTimeIcon color="primary" />
                      <Typography variant="h6">{healthData.uptime ?? '--'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Uptime
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Stack>
          ) : (
            <Typography color="text.secondary">No data available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHealthDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Server Confirmation */}
      <ConfirmDialog
        open={!!deleteServerTarget}
        title="Delete Server"
        message={`Are you sure you want to delete "${deleteServerTarget?.serverName}"? All allocations on this server will also be removed.`}
        confirmText="Delete"
        severity="error"
        onConfirm={handleDeleteServer}
        onCancel={() => setDeleteServerTarget(null)}
      />

      {/* Delete Service Confirmation */}
      <ConfirmDialog
        open={!!deleteServiceTarget}
        title="Delete Service"
        message={`Are you sure you want to delete "${deleteServiceTarget?.name}"? All allocations for this service will also be removed.`}
        confirmText="Delete"
        severity="error"
        onConfirm={handleDeleteService}
        onCancel={() => setDeleteServiceTarget(null)}
      />
    </Box>
  );
}
