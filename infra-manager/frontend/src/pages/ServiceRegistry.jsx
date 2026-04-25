import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Skeleton,
  Tooltip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  InputAdornment,
  Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import StorageIcon from '@mui/icons-material/Storage';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import { useAuth } from '../context/AuthContext';
import StatusChip from '../components/common/StatusChip';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  getApplications,
  getServices,
  getService,
  createService,
  getAllocationsByService,
  getInstances,
  startInstance,
  stopInstance,
  moveInstance,
  getServers,
  createAllocation,
  discoverServicesFromEureka,
} from '../api/endpoints';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ServiceRegistry() {
  const { isOperator } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  // Application state
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState('');

  // Services state
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Expanded service
  const [expandedService, setExpandedService] = useState(null);

  // Allocations per service
  const [allocationsMap, setAllocationsMap] = useState({});
  const [allocationsLoadingMap, setAllocationsLoadingMap] = useState({});

  // Instances per allocation
  const [instancesMap, setInstancesMap] = useState({});
  const [instancesLoadingMap, setInstancesLoadingMap] = useState({});
  const [expandedAllocations, setExpandedAllocations] = useState({});

  // Action loading
  const [actionLoading, setActionLoading] = useState({});

  // Stop confirm dialog
  const [stopConfirm, setStopConfirm] = useState(null);

  // Move instance dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTargetInstance, setMoveTargetInstance] = useState(null);
  const [moveAppId, setMoveAppId] = useState(null);
  const [moveForm, setMoveForm] = useState({
    targetServerId: '',
    targetPort: '',
    stopOnSource: true,
    startOnTarget: true,
  });
  const [moveServers, setMoveServers] = useState([]);
  const [movingInstance, setMovingInstance] = useState(false);

  // Allocate to server dialog
  const [allocDialogOpen, setAllocDialogOpen] = useState(false);
  const [allocServiceTarget, setAllocServiceTarget] = useState(null);
  const [allocServers, setAllocServers] = useState([]);
  const [allocForm, setAllocForm] = useState({
    serverId: '',
    plannedInstances: 1,
    deployPath: '',
    configOverrides: '',
  });
  const [savingAlloc, setSavingAlloc] = useState(false);

  // Add new service dialog
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    jarName: '',
    version: '',
    startScript: '',
    stopScript: '',
    healthCheckScript: '',
    eurekaServiceName: '',
    basePort: '',
    applicationId: '',
  });
  const [savingService, setSavingService] = useState(false);

  // Eureka discover state
  const [discovering, setDiscovering] = useState(false);

  // ─── Fetch Applications ────────────────────────────────────────────────

  const fetchApplications = useCallback(async () => {
    try {
      setAppsLoading(true);
      const res = await getApplications();
      setApplications(res.data);
    } catch {
      enqueueSnackbar('Failed to load applications', { variant: 'error' });
    } finally {
      setAppsLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // ─── Fetch Services ────────────────────────────────────────────────────

  const fetchServices = useCallback(async () => {
    if (!selectedAppId) {
      setServices([]);
      return;
    }
    try {
      setServicesLoading(true);
      const res = await getServices(selectedAppId);
      setServices(res.data);
    } catch {
      enqueueSnackbar('Failed to load services', { variant: 'error' });
    } finally {
      setServicesLoading(false);
    }
  }, [selectedAppId, enqueueSnackbar]);

  useEffect(() => {
    fetchServices();
    // Reset expansion states when switching apps
    setExpandedService(null);
    setAllocationsMap({});
    setInstancesMap({});
    setExpandedAllocations({});
  }, [fetchServices]);

  // ─── Fetch Allocations for Service ─────────────────────────────────────

  const fetchAllocations = useCallback(
    async (serviceId) => {
      try {
        setAllocationsLoadingMap((m) => ({ ...m, [serviceId]: true }));
        const res = await getAllocationsByService(serviceId);
        setAllocationsMap((m) => ({ ...m, [serviceId]: res.data }));
      } catch {
        enqueueSnackbar('Failed to load allocations', { variant: 'error' });
      } finally {
        setAllocationsLoadingMap((m) => ({ ...m, [serviceId]: false }));
      }
    },
    [enqueueSnackbar]
  );

  // ─── Fetch Instances for Allocation ────────────────────────────────────

  const fetchInstances = useCallback(
    async (allocationId) => {
      try {
        setInstancesLoadingMap((m) => ({ ...m, [allocationId]: true }));
        const res = await getInstances(allocationId);
        setInstancesMap((m) => ({ ...m, [allocationId]: res.data }));
      } catch {
        enqueueSnackbar('Failed to load instances', { variant: 'error' });
      } finally {
        setInstancesLoadingMap((m) => ({ ...m, [allocationId]: false }));
      }
    },
    [enqueueSnackbar]
  );

  // ─── Accordion Handlers ────────────────────────────────────────────────

  const handleServiceExpand = (serviceId) => (_, isExpanded) => {
    setExpandedService(isExpanded ? serviceId : null);
    if (isExpanded && !allocationsMap[serviceId]) {
      fetchAllocations(serviceId);
    }
  };

  const handleAllocationExpand = (allocationId) => {
    setExpandedAllocations((prev) => {
      const next = { ...prev, [allocationId]: !prev[allocationId] };
      if (next[allocationId] && !instancesMap[allocationId]) {
        fetchInstances(allocationId);
      }
      return next;
    });
  };

  // ─── Instance Actions ─────────────────────────────────────────────────

  const handleStartInstance = async (instanceId, allocationId) => {
    try {
      setActionLoading((m) => ({ ...m, [instanceId]: true }));
      await startInstance(instanceId);
      enqueueSnackbar('Instance started', { variant: 'success' });
      fetchInstances(allocationId);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to start instance', {
        variant: 'error',
      });
    } finally {
      setActionLoading((m) => ({ ...m, [instanceId]: false }));
    }
  };

  const handleStopInstance = async () => {
    if (!stopConfirm) return;
    const { instanceId, allocationId } = stopConfirm;
    try {
      setActionLoading((m) => ({ ...m, [instanceId]: true }));
      await stopInstance(instanceId);
      enqueueSnackbar('Instance stopped', { variant: 'success' });
      setStopConfirm(null);
      fetchInstances(allocationId);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to stop instance', {
        variant: 'error',
      });
    } finally {
      setActionLoading((m) => ({ ...m, [stopConfirm.instanceId]: false }));
    }
  };

  // ─── Move Instance ─────────────────────────────────────────────────────

  const openMoveDialog = async (instance, appIdForServers) => {
    setMoveTargetInstance(instance);
    setMoveAppId(appIdForServers);
    setMoveForm({
      targetServerId: '',
      targetPort: '',
      stopOnSource: true,
      startOnTarget: true,
    });
    setMoveDialogOpen(true);
    try {
      const res = await getServers(appIdForServers);
      setMoveServers(res.data);
    } catch {
      enqueueSnackbar('Failed to load servers', { variant: 'error' });
    }
  };

  const handleMoveInstance = async () => {
    if (!moveTargetInstance) return;
    try {
      setMovingInstance(true);
      await moveInstance(moveTargetInstance.id, {
        targetServerId: Number(moveForm.targetServerId),
        targetPort: moveForm.targetPort ? Number(moveForm.targetPort) : null,
        stopOnSource: moveForm.stopOnSource,
        startOnTarget: moveForm.startOnTarget,
      });
      enqueueSnackbar('Instance moved successfully', { variant: 'success' });
      setMoveDialogOpen(false);
      // Refresh the service allocations
      if (expandedService) {
        fetchAllocations(expandedService);
      }
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to move instance', {
        variant: 'error',
      });
    } finally {
      setMovingInstance(false);
    }
  };

  // ─── Allocate to Server ────────────────────────────────────────────────

  const openAllocDialog = async (service) => {
    setAllocServiceTarget(service);
    setAllocForm({
      serverId: '',
      plannedInstances: 1,
      deployPath: '',
      configOverrides: '',
    });
    setAllocDialogOpen(true);
    try {
      const appId = service.applicationId || selectedAppId;
      const res = await getServers(appId);
      setAllocServers(res.data);
    } catch {
      enqueueSnackbar('Failed to load servers', { variant: 'error' });
    }
  };

  const handleCreateAllocation = async () => {
    if (!allocForm.serverId) {
      enqueueSnackbar('Please select a server', { variant: 'warning' });
      return;
    }
    try {
      setSavingAlloc(true);
      let configOverrides = null;
      if (allocForm.configOverrides.trim()) {
        try {
          configOverrides = JSON.parse(allocForm.configOverrides);
        } catch {
          enqueueSnackbar('Config overrides must be valid JSON', { variant: 'warning' });
          setSavingAlloc(false);
          return;
        }
      }
      await createAllocation({
        serviceId: allocServiceTarget.id,
        serverId: Number(allocForm.serverId),
        plannedInstances: Number(allocForm.plannedInstances),
        deployPath: allocForm.deployPath || null,
        configOverrides,
      });
      enqueueSnackbar('Allocation created', { variant: 'success' });
      setAllocDialogOpen(false);
      if (expandedService) {
        fetchAllocations(expandedService);
      }
      fetchServices();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create allocation', {
        variant: 'error',
      });
    } finally {
      setSavingAlloc(false);
    }
  };

  // ─── Add New Service ───────────────────────────────────────────────────

  const openAddService = () => {
    setServiceForm({
      name: '',
      description: '',
      jarName: '',
      version: '',
      startScript: '',
      stopScript: '',
      healthCheckScript: '',
      eurekaServiceName: '',
      basePort: '',
      applicationId: selectedAppId || '',
    });
    setServiceDialogOpen(true);
  };

  const handleCreateService = async () => {
    if (!serviceForm.name.trim()) {
      enqueueSnackbar('Service name is required', { variant: 'warning' });
      return;
    }
    if (!serviceForm.applicationId) {
      enqueueSnackbar('Please select an application', { variant: 'warning' });
      return;
    }
    try {
      setSavingService(true);
      await createService({
        ...serviceForm,
        applicationId: Number(serviceForm.applicationId),
        basePort: serviceForm.basePort ? Number(serviceForm.basePort) : null,
      });
      enqueueSnackbar('Service created', { variant: 'success' });
      setServiceDialogOpen(false);
      fetchServices();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create service', {
        variant: 'error',
      });
    } finally {
      setSavingService(false);
    }
  };

  // ─── Discover from Eureka ────────────────────────────────────────────────

  const selectedApp = useMemo(
    () => applications.find((a) => a.id === selectedAppId),
    [applications, selectedAppId]
  );

  const handleDiscoverFromEureka = async () => {
    if (!selectedAppId) return;
    try {
      setDiscovering(true);
      const res = await discoverServicesFromEureka(selectedAppId);
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

  // ─── Filtered Services ─────────────────────────────────────────────────

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(
      (svc) =>
        (svc.name || '').toLowerCase().includes(q) ||
        (svc.eurekaServiceName || '').toLowerCase().includes(q) ||
        (svc.jarName || '').toLowerCase().includes(q)
    );
  }, [services, searchQuery]);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Service Registry
        </Typography>
        <Stack direction="row" spacing={1}>
          {isOperator && selectedApp?.eurekaEnabled && (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={discovering ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
              onClick={handleDiscoverFromEureka}
              disabled={discovering || !selectedAppId}
              size="small"
            >
              {discovering ? 'Discovering...' : 'Import from Eureka'}
            </Button>
          )}
          {isOperator && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAddService}>
              Add New Service
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Filters Row */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        {appsLoading ? (
          <Skeleton width={250} height={56} />
        ) : (
          <TextField
            select
            label="Application"
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            sx={{ minWidth: 250 }}
            size="small"
          >
            <MenuItem value="" disabled>
              Select an application
            </MenuItem>
            {applications.map((app) => (
              <MenuItem key={app.id} value={app.id}>
                {app.name}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          label="Search services"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <Divider sx={{ mb: 3 }} />

      {/* Content */}
      {!selectedAppId ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <MiscellaneousServicesIcon sx={{ fontSize: 72, color: 'text.disabled' }} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            Select an application to view its services
          </Typography>
        </Box>
      ) : servicesLoading ? (
        <Box>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={80}
              sx={{ borderRadius: 1, mb: 2 }}
            />
          ))}
        </Box>
      ) : filteredServices.length === 0 ? (
        searchQuery ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <StorageIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
              No services match your search
            </Typography>
          </Box>
        ) : (
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
              {isOperator && (
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
              {isOperator && selectedApp?.eurekaEnabled && (
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
              {isOperator && (
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
            {selectedApp && !selectedApp.eurekaEnabled && (
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
        )
      ) : (
        filteredServices.map((svc) => (
          <Accordion
            key={svc.id}
            expanded={expandedService === svc.id}
            onChange={handleServiceExpand(svc.id)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{ width: '100%', pr: 2 }}
                flexWrap="wrap"
                useFlexGap
              >
                <Typography variant="h6" fontWeight={600} sx={{ minWidth: 180 }}>
                  {svc.name}
                </Typography>
                {svc.version && (
                  <Chip
                    label={`v${svc.version}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                {svc.jarName && (
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                    {svc.jarName}
                  </Typography>
                )}
                {svc.basePort && (
                  <Chip label={`Port ${svc.basePort}`} size="small" variant="outlined" />
                )}
                {svc.eurekaServiceName && (
                  <Chip
                    label={svc.eurekaServiceName}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                )}
                <Box sx={{ flexGrow: 1 }} />
                <Chip
                  label={`${svc.allocationCount ?? 0} server(s), ${svc.instanceCount ?? 0} instance(s)`}
                  size="small"
                  color="info"
                  variant="filled"
                />
                <StatusChip status={svc.status || 'ACTIVE'} />
              </Stack>
            </AccordionSummary>

            <AccordionDetails>
              {allocationsLoadingMap[svc.id] ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Loading allocations...
                  </Typography>
                </Box>
              ) : !allocationsMap[svc.id] || allocationsMap[svc.id].length === 0 ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No server allocations for this service.
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width={40} />
                          <TableCell>Server</TableCell>
                          <TableCell>IP Address</TableCell>
                          <TableCell>Planned Instances</TableCell>
                          <TableCell>Deploy Path</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allocationsMap[svc.id].map((alloc) => (
                          <React.Fragment key={alloc.id}>
                            {/* Allocation Row */}
                            <TableRow
                              hover
                              sx={{ cursor: 'pointer' }}
                              onClick={() => handleAllocationExpand(alloc.id)}
                            >
                              <TableCell>
                                <IconButton size="small">
                                  <ExpandMoreIcon
                                    fontSize="small"
                                    sx={{
                                      transform: expandedAllocations[alloc.id]
                                        ? 'rotate(180deg)'
                                        : 'rotate(0deg)',
                                      transition: 'transform 0.2s',
                                    }}
                                  />
                                </IconButton>
                              </TableCell>
                              <TableCell>
                                <Typography fontWeight={500}>
                                  {alloc.serverAlias || alloc.serverName || `Server #${alloc.serverId}`}
                                </Typography>
                              </TableCell>
                              <TableCell>{alloc.serverIp || '--'}</TableCell>
                              <TableCell>{alloc.plannedInstances ?? 0}</TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  noWrap
                                  sx={{ maxWidth: 250 }}
                                  title={alloc.deployPath}
                                >
                                  {alloc.deployPath || '--'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <StatusChip status={alloc.status || 'ACTIVE'} />
                              </TableCell>
                            </TableRow>

                            {/* Instances Sub-rows */}
                            <TableRow>
                              <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                                <Collapse
                                  in={!!expandedAllocations[alloc.id]}
                                  timeout="auto"
                                  unmountOnExit
                                >
                                  <Box sx={{ py: 1, px: 4, backgroundColor: 'action.hover' }}>
                                    {instancesLoadingMap[alloc.id] ? (
                                      <Box sx={{ py: 2, textAlign: 'center' }}>
                                        <CircularProgress size={22} />
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                          sx={{ mt: 1 }}
                                        >
                                          Loading instances...
                                        </Typography>
                                      </Box>
                                    ) : !instancesMap[alloc.id] ||
                                      instancesMap[alloc.id].length === 0 ? (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ py: 2 }}
                                      >
                                        No instances found.
                                      </Typography>
                                    ) : (
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell>Index</TableCell>
                                            <TableCell>Port</TableCell>
                                            <TableCell>PID</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Eureka</TableCell>
                                            <TableCell>Health</TableCell>
                                            <TableCell align="right">Actions</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {instancesMap[alloc.id].map((inst) => (
                                            <TableRow key={inst.id}>
                                              <TableCell>
                                                {inst.instanceIndex ?? inst.index ?? '--'}
                                              </TableCell>
                                              <TableCell>{inst.port ?? '--'}</TableCell>
                                              <TableCell>{inst.pid ?? '--'}</TableCell>
                                              <TableCell>
                                                <StatusChip status={inst.status} />
                                              </TableCell>
                                              <TableCell>
                                                {inst.eurekaRegistered ? (
                                                  <Tooltip title="Registered in Eureka">
                                                    <CheckCircleIcon
                                                      color="success"
                                                      fontSize="small"
                                                    />
                                                  </Tooltip>
                                                ) : (
                                                  <Tooltip title="Not registered in Eureka">
                                                    <CancelIcon color="error" fontSize="small" />
                                                  </Tooltip>
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                <StatusChip
                                                  status={inst.healthStatus || 'UNKNOWN'}
                                                  size="small"
                                                />
                                              </TableCell>
                                              <TableCell align="right">
                                                <Stack
                                                  direction="row"
                                                  spacing={0.5}
                                                  justifyContent="flex-end"
                                                >
                                                  <Tooltip title="Start">
                                                    <span>
                                                      <IconButton
                                                        size="small"
                                                        color="success"
                                                        disabled={
                                                          actionLoading[inst.id] ||
                                                          inst.status === 'RUNNING'
                                                        }
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleStartInstance(inst.id, alloc.id);
                                                        }}
                                                      >
                                                        <PlayArrowIcon fontSize="small" />
                                                      </IconButton>
                                                    </span>
                                                  </Tooltip>
                                                  <Tooltip title="Stop">
                                                    <span>
                                                      <IconButton
                                                        size="small"
                                                        color="error"
                                                        disabled={
                                                          actionLoading[inst.id] ||
                                                          inst.status === 'STOPPED'
                                                        }
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setStopConfirm({
                                                            instanceId: inst.id,
                                                            allocationId: alloc.id,
                                                          });
                                                        }}
                                                      >
                                                        <StopIcon fontSize="small" />
                                                      </IconButton>
                                                    </span>
                                                  </Tooltip>
                                                  <Tooltip title="Move">
                                                    <IconButton
                                                      size="small"
                                                      color="primary"
                                                      disabled={actionLoading[inst.id]}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openMoveDialog(
                                                          inst,
                                                          svc.applicationId || selectedAppId
                                                        );
                                                      }}
                                                    >
                                                      <OpenWithIcon fontSize="small" />
                                                    </IconButton>
                                                  </Tooltip>
                                                </Stack>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    )}
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Allocate to Server button */}
                  {isOperator && (
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAllocDialog(svc);
                        }}
                      >
                        Allocate to Server
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* ═══════════════════ DIALOGS ═══════════════════ */}

      {/* Move Instance Dialog */}
      <Dialog
        open={moveDialogOpen}
        onClose={() => setMoveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Move Instance</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Target Server"
              value={moveForm.targetServerId}
              onChange={(e) =>
                setMoveForm((f) => ({ ...f, targetServerId: e.target.value }))
              }
              fullWidth
              required
            >
              {moveServers.length === 0 ? (
                <MenuItem disabled>No servers available</MenuItem>
              ) : (
                moveServers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.alias || s.machineName} ({s.ipAddress})
                  </MenuItem>
                ))
              )}
            </TextField>
            <TextField
              label="Target Port"
              type="number"
              value={moveForm.targetPort}
              onChange={(e) =>
                setMoveForm((f) => ({ ...f, targetPort: e.target.value }))
              }
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={moveForm.stopOnSource}
                  onChange={(e) =>
                    setMoveForm((f) => ({ ...f, stopOnSource: e.target.checked }))
                  }
                />
              }
              label="Stop instance on source server"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={moveForm.startOnTarget}
                  onChange={(e) =>
                    setMoveForm((f) => ({ ...f, startOnTarget: e.target.checked }))
                  }
                />
              }
              label="Start instance on target server"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleMoveInstance}
            variant="contained"
            disabled={movingInstance || !moveForm.targetServerId}
          >
            {movingInstance ? 'Moving...' : 'Move'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Allocate to Server Dialog */}
      <Dialog
        open={allocDialogOpen}
        onClose={() => setAllocDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Allocate {allocServiceTarget?.name || 'Service'} to Server
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Server"
              value={allocForm.serverId}
              onChange={(e) =>
                setAllocForm((f) => ({ ...f, serverId: e.target.value }))
              }
              fullWidth
              required
            >
              {allocServers.length === 0 ? (
                <MenuItem disabled>No servers available</MenuItem>
              ) : (
                allocServers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.alias || s.machineName} ({s.ipAddress})
                  </MenuItem>
                ))
              )}
            </TextField>
            <TextField
              label="Planned Instance Count"
              type="number"
              value={allocForm.plannedInstances}
              onChange={(e) =>
                setAllocForm((f) => ({ ...f, plannedInstances: e.target.value }))
              }
              fullWidth
              required
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Deploy Path"
              value={allocForm.deployPath}
              onChange={(e) =>
                setAllocForm((f) => ({ ...f, deployPath: e.target.value }))
              }
              fullWidth
              placeholder="/opt/services/my-service"
            />
            <TextField
              label="Config Overrides (JSON)"
              value={allocForm.configOverrides}
              onChange={(e) =>
                setAllocForm((f) => ({ ...f, configOverrides: e.target.value }))
              }
              fullWidth
              multiline
              rows={4}
              placeholder='{"key": "value"}'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAllocDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateAllocation}
            variant="contained"
            disabled={savingAlloc}
          >
            {savingAlloc ? 'Creating...' : 'Allocate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add New Service Dialog */}
      <Dialog
        open={serviceDialogOpen}
        onClose={() => setServiceDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add New Service</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Application"
                value={serviceForm.applicationId}
                onChange={(e) =>
                  setServiceForm((f) => ({ ...f, applicationId: e.target.value }))
                }
                fullWidth
                required
                size="small"
              >
                {applications.map((app) => (
                  <MenuItem key={app.id} value={app.id}>
                    {app.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {[
              { key: 'name', label: 'Name', required: true },
              { key: 'version', label: 'Version' },
              { key: 'jarName', label: 'JAR Name' },
              { key: 'description', label: 'Description' },
              { key: 'eurekaServiceName', label: 'Eureka Service Name' },
              { key: 'basePort', label: 'Base Port', type: 'number' },
            ].map(({ key, label, required, type }) => (
              <Grid item xs={12} sm={6} key={key}>
                <TextField
                  label={label}
                  value={serviceForm[key]}
                  onChange={(e) =>
                    setServiceForm((f) => ({ ...f, [key]: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setServiceForm((f) => ({ ...f, [key]: e.target.value }))
                  }
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
          <Button
            onClick={handleCreateService}
            variant="contained"
            disabled={savingService}
          >
            {savingService ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stop Instance Confirmation */}
      <ConfirmDialog
        open={!!stopConfirm}
        title="Stop Instance"
        message="Are you sure you want to stop this instance? It will become unavailable until restarted."
        confirmText="Stop"
        severity="warning"
        onConfirm={handleStopInstance}
        onCancel={() => setStopConfirm(null)}
      />
    </Box>
  );
}
