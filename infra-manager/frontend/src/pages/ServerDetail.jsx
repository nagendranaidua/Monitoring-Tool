import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Alert,
  Tooltip,
  Divider,
  LinearProgress,
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import AddIcon from '@mui/icons-material/Add';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DnsIcon from '@mui/icons-material/Dns';
import { useSnackbar } from 'notistack';

import { useAuth } from '../context/AuthContext';
import StatusChip from '../components/common/StatusChip';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  getServer,
  healthCheck,
  getAllocationsByServer,
  getInstances,
  startInstance,
  stopInstance,
  moveInstance,
  getServers,
  getServices,
  createAllocation,
} from '../api/endpoints';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ServerDetail() {
  const { appId, serverId } = useParams();
  const navigate = useNavigate();
  const { isOperator } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Server state
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Health check state
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Allocations state
  const [allocations, setAllocations] = useState([]);
  const [allocationsLoading, setAllocationsLoading] = useState(true);
  const [instancesMap, setInstancesMap] = useState({});
  const [instancesLoadingMap, setInstancesLoadingMap] = useState({});
  const [expandedAlloc, setExpandedAlloc] = useState(null);

  // Move instance dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTargetInstance, setMoveTargetInstance] = useState(null);
  const [moveForm, setMoveForm] = useState({
    targetServerId: '',
    targetPort: '',
    stopOnSource: true,
    startOnTarget: true,
  });
  const [moveServers, setMoveServers] = useState([]);
  const [movingInstance, setMovingInstance] = useState(false);

  // Add allocation dialog
  const [allocDialogOpen, setAllocDialogOpen] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [allocForm, setAllocForm] = useState({
    serviceId: '',
    plannedInstances: 1,
    deployPath: '',
    configOverrides: '',
  });
  const [savingAlloc, setSavingAlloc] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState({});

  // Stop confirm dialog
  const [stopConfirm, setStopConfirm] = useState(null);

  // ─── Fetch Server ──────────────────────────────────────────────────────

  const fetchServer = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getServer(serverId);
      setServer(res.data);
    } catch {
      enqueueSnackbar('Failed to load server details', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [serverId, enqueueSnackbar]);

  const fetchAllocations = useCallback(async () => {
    try {
      setAllocationsLoading(true);
      const res = await getAllocationsByServer(serverId);
      setAllocations(res.data);
    } catch {
      enqueueSnackbar('Failed to load allocations', { variant: 'error' });
    } finally {
      setAllocationsLoading(false);
    }
  }, [serverId, enqueueSnackbar]);

  useEffect(() => {
    fetchServer();
    fetchAllocations();
  }, [fetchServer, fetchAllocations]);

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

  const handleAccordionChange = (allocationId) => (_, isExpanded) => {
    setExpandedAlloc(isExpanded ? allocationId : null);
    if (isExpanded && !instancesMap[allocationId]) {
      fetchInstances(allocationId);
    }
  };

  // ─── Health Check ──────────────────────────────────────────────────────

  const handleHealthCheck = async () => {
    try {
      setHealthLoading(true);
      setHealthData(null);
      const res = await healthCheck(serverId);
      setHealthData(res.data);
    } catch {
      enqueueSnackbar('Health check failed', { variant: 'error' });
    } finally {
      setHealthLoading(false);
    }
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

  const openMoveDialog = async (instance) => {
    setMoveTargetInstance(instance);
    setMoveForm({
      targetServerId: '',
      targetPort: '',
      stopOnSource: true,
      startOnTarget: true,
    });
    setMoveDialogOpen(true);
    try {
      const res = await getServers(appId);
      setMoveServers(res.data.filter((s) => s.id !== Number(serverId)));
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
      fetchAllocations();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to move instance', {
        variant: 'error',
      });
    } finally {
      setMovingInstance(false);
    }
  };

  // ─── Add Allocation ────────────────────────────────────────────────────

  const openAllocDialog = async () => {
    setAllocForm({
      serviceId: '',
      plannedInstances: 1,
      deployPath: '',
      configOverrides: '',
    });
    setAllocDialogOpen(true);
    try {
      const res = await getServices(appId);
      setAvailableServices(res.data);
    } catch {
      enqueueSnackbar('Failed to load services', { variant: 'error' });
    }
  };

  const handleCreateAllocation = async () => {
    if (!allocForm.serviceId) {
      enqueueSnackbar('Please select a service', { variant: 'warning' });
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
        serviceId: Number(allocForm.serviceId),
        serverId: Number(serverId),
        plannedInstances: Number(allocForm.plannedInstances),
        deployPath: allocForm.deployPath || null,
        configOverrides,
      });
      enqueueSnackbar('Service allocation created', { variant: 'success' });
      setAllocDialogOpen(false);
      fetchAllocations();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create allocation', {
        variant: 'error',
      });
    } finally {
      setSavingAlloc(false);
    }
  };

  // ─── Detail Row Helper ─────────────────────────────────────────────────

  const DetailRow = ({ label, value }) => (
    <>
      <Grid item xs={6} sm={3}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {value || '--'}
        </Typography>
      </Grid>
    </>
  );

  // ─── Render: Loading ───────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton width={300} height={40} />
            <Skeleton width={200} height={24} />
          </Box>
        </Stack>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1, mb: 3 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  if (!server) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 6 }}>
        <DnsIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="h5" color="text.secondary" sx={{ mt: 1 }}>
          Server not found
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/apps/${appId}`)}
          sx={{ mt: 2 }}
        >
          Back to Application
        </Button>
      </Box>
    );
  }

  // ─── Main Render ───────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate(`/apps/${appId}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h4" fontWeight={700}>
              {server.alias || server.machineName}
            </Typography>
            <StatusChip status={server.status} />
          </Stack>
          {server.alias && (
            <Typography variant="body1" color="text.secondary">
              {server.machineName}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          startIcon={<MonitorHeartIcon />}
          onClick={handleHealthCheck}
          disabled={healthLoading}
        >
          {healthLoading ? 'Checking...' : 'Health Check'}
        </Button>
      </Stack>

      <Divider sx={{ mb: 3 }} />

      {/* ──────── Server Info Card ──────── */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Server Information
            </Typography>
            <Chip label={server.ipAddress} size="small" variant="outlined" />
            <StatusChip status={server.environment} />
          </Stack>

          <Grid container spacing={2}>
            <DetailRow label="Availability Zone" value={server.availabilityZone} />
            <DetailRow label="Datacenter" value={server.datacenter} />
            <DetailRow label="OS" value={server.os} />
            <DetailRow label="OS Version" value={server.osVersion} />
            <DetailRow label="VM Type" value={server.vmType} />
            <DetailRow label="CPU Cores" value={server.cpuCores} />
            <DetailRow label="RAM (GB)" value={server.ramGb} />
            <DetailRow label="Disk (GB)" value={server.diskGb} />
            <DetailRow label="Usage Role" value={server.usageRole} />
            <DetailRow label="SSH Port" value={server.sshPort || '22'} />
            <DetailRow label="Remark" value={server.remark} />
          </Grid>
        </CardContent>
      </Card>

      {/* ──────── Health Check Results ──────── */}
      {healthLoading && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <LinearProgress />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2, textAlign: 'center' }}
            >
              Running health check...
            </Typography>
          </CardContent>
        </Card>
      )}

      {healthData && !healthLoading && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Health Check Results
            </Typography>

            <Alert
              severity={healthData.reachable ? 'success' : 'error'}
              sx={{ mb: 2 }}
            >
              {healthData.reachable ? 'Server is reachable' : 'Server is unreachable'}
            </Alert>

            {healthData.reachable && (
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <MemoryIcon color="primary" />
                    <Typography variant="h5" fontWeight={700}>
                      {healthData.cpuUsage ?? '--'}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      CPU Usage
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <SpeedIcon color="primary" />
                    <Typography variant="h5" fontWeight={700}>
                      {healthData.memoryUsed ?? '--'} / {healthData.memoryTotal ?? '--'} GB
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Memory
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <StorageIcon color="primary" />
                    <Typography variant="h5" fontWeight={700}>
                      {healthData.diskUsage ?? '--'}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Disk Usage
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <AccessTimeIcon color="primary" />
                    <Typography variant="h5" fontWeight={700}>
                      {healthData.uptime ?? '--'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Uptime
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {/* ──────── Allocated Services ──────── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Allocated Services
        </Typography>
        {isOperator && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAllocDialog}>
            Add Service Allocation
          </Button>
        )}
      </Stack>

      {allocationsLoading ? (
        <Box>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={60}
              sx={{ borderRadius: 1, mb: 1 }}
            />
          ))}
        </Box>
      ) : allocations.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <StorageIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            No services allocated to this server
          </Typography>
        </Card>
      ) : (
        allocations.map((alloc) => (
          <Accordion
            key={alloc.id}
            expanded={expandedAlloc === alloc.id}
            onChange={handleAccordionChange(alloc.id)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{ width: '100%', pr: 2 }}
              >
                <Typography fontWeight={600} sx={{ minWidth: 180 }}>
                  {alloc.serviceName || `Service #${alloc.serviceId}`}
                </Typography>
                {alloc.version && (
                  <Chip
                    label={`v${alloc.version}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                <Chip
                  label={`${alloc.plannedInstances ?? 0} instance(s)`}
                  size="small"
                  variant="outlined"
                />
                {alloc.deployPath && (
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 250 }}>
                    {alloc.deployPath}
                  </Typography>
                )}
                <Box sx={{ flexGrow: 1 }} />
                <StatusChip status={alloc.status || 'ACTIVE'} />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              {instancesLoadingMap[alloc.id] ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Loading instances...
                  </Typography>
                </Box>
              ) : !instancesMap[alloc.id] || instancesMap[alloc.id].length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No instances found for this allocation.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
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
                        <TableRow key={inst.id} hover>
                          <TableCell>{inst.instanceIndex ?? inst.index ?? '--'}</TableCell>
                          <TableCell>{inst.port ?? '--'}</TableCell>
                          <TableCell>{inst.pid ?? '--'}</TableCell>
                          <TableCell>
                            <StatusChip status={inst.status} />
                          </TableCell>
                          <TableCell>
                            {inst.eurekaRegistered ? (
                              <Tooltip title="Registered in Eureka">
                                <CheckCircleIcon color="success" fontSize="small" />
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
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Start">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    disabled={
                                      actionLoading[inst.id] ||
                                      inst.status === 'RUNNING'
                                    }
                                    onClick={() =>
                                      handleStartInstance(inst.id, alloc.id)
                                    }
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
                                    onClick={() =>
                                      setStopConfirm({
                                        instanceId: inst.id,
                                        allocationId: alloc.id,
                                      })
                                    }
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
                                  onClick={() => openMoveDialog(inst)}
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
                </TableContainer>
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
                <MenuItem disabled>No other servers available</MenuItem>
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

      {/* Add Service Allocation Dialog */}
      <Dialog
        open={allocDialogOpen}
        onClose={() => setAllocDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Service Allocation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Service"
              value={allocForm.serviceId}
              onChange={(e) =>
                setAllocForm((f) => ({ ...f, serviceId: e.target.value }))
              }
              fullWidth
              required
            >
              {availableServices.length === 0 ? (
                <MenuItem disabled>No services available</MenuItem>
              ) : (
                availableServices.map((svc) => (
                  <MenuItem key={svc.id} value={svc.id}>
                    {svc.name} {svc.version ? `(v${svc.version})` : ''}
                  </MenuItem>
                ))
              )}
            </TextField>
            <TextField
              label="Planned Instance Count"
              type="number"
              value={allocForm.plannedInstances}
              onChange={(e) =>
                setAllocForm((f) => ({
                  ...f,
                  plannedInstances: e.target.value,
                }))
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
            {savingAlloc ? 'Creating...' : 'Create'}
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
