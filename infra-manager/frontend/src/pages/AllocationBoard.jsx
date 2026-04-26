import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Skeleton,
  Stack,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MoveDownIcon from '@mui/icons-material/MoveDown';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TableChartIcon from '@mui/icons-material/TableChart';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useSnackbar } from 'notistack';

import { useAuth } from '../context/AuthContext';
import StatusChip from '../components/common/StatusChip';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  getApplications,
  getServers,
  getServices,
  getAllocationsByServer,
  getInstances,
  createAllocation,
  removeAllocation,
  moveAllocation,
} from '../api/endpoints';

// ─── Component ───────────────────────────────────────────────────────────────

export default function AllocationBoard() {
  const { isAdmin, isOperator } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Data
  const [apps, setApps] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [servers, setServers] = useState([]);
  const [services, setServices] = useState([]);
  const [allocations, setAllocations] = useState([]); // flattened list with server/service info

  // UI
  const [loading, setLoading] = useState(false);
  const [appsLoading, setAppsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('board');

  // New Allocation dialog
  const [newAllocOpen, setNewAllocOpen] = useState(false);
  const [allocForm, setAllocForm] = useState({
    serviceId: '',
    serverId: '',
    plannedInstances: 1,
    deployPath: '',
  });
  const [savingAlloc, setSavingAlloc] = useState(false);

  // Move dialog
  const [moveTarget, setMoveTarget] = useState(null);
  const [moveServerId, setMoveServerId] = useState('');
  const [moving, setMoving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ─── Fetch Applications ────────────────────────────────────────────────

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

  // ─── Fetch Board Data ──────────────────────────────────────────────────

  const fetchBoardData = useCallback(async () => {
    if (!selectedAppId) return;
    try {
      setLoading(true);
      const [srvRes, svcRes] = await Promise.all([
        getServers(selectedAppId),
        getServices(selectedAppId),
      ]);
      const srvList = srvRes.data;
      const svcList = svcRes.data;
      setServers(srvList);
      setServices(svcList);

      // Fetch allocations for each server
      const allocPromises = srvList.map((srv) =>
        getAllocationsByServer(srv.id)
          .then((res) => res.data.map((a) => ({ ...a, _server: srv })))
          .catch(() => [])
      );
      const allAllocArrays = await Promise.all(allocPromises);
      const flatAllocs = allAllocArrays.flat();

      // Enrich with service info and fetch instances
      const enriched = flatAllocs.map((a) => {
        const svc = svcList.find((s) => s.id === a.serviceId);
        return {
          ...a,
          serviceName: svc?.name || a.serviceName || 'Unknown',
          serverName: a._server?.serverName || '',
          serverAlias: a._server?.alias || '',
          serverIp: a._server?.ipAddress || '',
          serverEnvironment: a._server?.environment || '',
        };
      });

      // Fetch instances for each allocation to get running counts
      const instancePromises = enriched.map((a) =>
        getInstances(a.id)
          .then((res) => ({
            ...a,
            instances: res.data,
            runningInstances: res.data.filter(
              (i) => i.status === 'RUNNING' || i.status === 'UP'
            ).length,
            totalInstances: res.data.length,
          }))
          .catch(() => ({
            ...a,
            instances: [],
            runningInstances: 0,
            totalInstances: 0,
          }))
      );
      const finalAllocs = await Promise.all(instancePromises);
      setAllocations(finalAllocs);
    } catch {
      enqueueSnackbar('Failed to load allocation data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedAppId, enqueueSnackbar]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // ─── Allocation by server map ──────────────────────────────────────────

  const allocationsByServer = useMemo(() => {
    const map = {};
    servers.forEach((srv) => {
      map[srv.id] = allocations.filter((a) => a.serverId === srv.id);
    });
    return map;
  }, [servers, allocations]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleNewAllocation = async () => {
    if (!allocForm.serviceId || !allocForm.serverId) {
      enqueueSnackbar('Please select both a service and a server', { variant: 'warning' });
      return;
    }
    try {
      setSavingAlloc(true);
      await createAllocation({
        serviceId: Number(allocForm.serviceId),
        serverId: Number(allocForm.serverId),
        plannedInstances: Number(allocForm.plannedInstances) || 1,
        deployPath: allocForm.deployPath,
      });
      enqueueSnackbar('Allocation created', { variant: 'success' });
      setNewAllocOpen(false);
      setAllocForm({ serviceId: '', serverId: '', plannedInstances: 1, deployPath: '' });
      fetchBoardData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create allocation', {
        variant: 'error',
      });
    } finally {
      setSavingAlloc(false);
    }
  };

  const handleRemove = async () => {
    if (!deleteTarget) return;
    try {
      await removeAllocation(deleteTarget.id);
      enqueueSnackbar('Allocation removed', { variant: 'success' });
      setDeleteTarget(null);
      fetchBoardData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to remove allocation', {
        variant: 'error',
      });
    }
  };

  const handleMove = async () => {
    if (!moveTarget || !moveServerId) return;
    try {
      setMoving(true);
      await moveAllocation(moveTarget.id, { targetServerId: Number(moveServerId) });
      enqueueSnackbar('Allocation moved', { variant: 'success' });
      setMoveTarget(null);
      setMoveServerId('');
      fetchBoardData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to move allocation', {
        variant: 'error',
      });
    } finally {
      setMoving(false);
    }
  };

  // ─── Card border color helper ──────────────────────────────────────────

  const getCardBorderColor = (alloc) => {
    if (alloc.totalInstances === 0) return '#9e9e9e';
    if (alloc.runningInstances === alloc.totalInstances) return '#4caf50';
    if (alloc.runningInstances === 0) return '#f44336';
    return '#ff9800';
  };

  // ─── DataGrid columns ─────────────────────────────────────────────────

  const tableColumns = [
    { field: 'serviceName', headerName: 'Service Name', flex: 1, minWidth: 150 },
    { field: 'serverName', headerName: 'Server Name', flex: 0.8, minWidth: 120 },
    { field: 'serverIp', headerName: 'Server IP', flex: 0.8, minWidth: 130 },
    {
      field: 'plannedInstances',
      headerName: 'Planned Instances',
      flex: 0.6,
      minWidth: 120,
      type: 'number',
    },
    {
      field: 'runningInstances',
      headerName: 'Running Instances',
      flex: 0.6,
      minWidth: 130,
      type: 'number',
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.6,
      minWidth: 100,
      renderCell: (params) => {
        const alloc = params.row;
        if (alloc.totalInstances === 0) return <StatusChip status="PLANNED" />;
        if (alloc.runningInstances === alloc.totalInstances) return <StatusChip status="RUNNING" />;
        if (alloc.runningInstances === 0) return <StatusChip status="STOPPED" />;
        return <StatusChip status="STARTING" />;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.7,
      minWidth: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) =>
        isOperator ? (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Move">
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveTarget(params.row);
                  setMoveServerId('');
                }}
              >
                <MoveDownIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(params.row);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : null,
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────

  const renderSkeletons = () => (
    <Grid container spacing={3}>
      {[1, 2, 3, 4].map((i) => (
        <Grid item xs={12} sm={6} md={3} key={i}>
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
        </Grid>
      ))}
    </Grid>
  );

  const renderEmpty = () => (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <DashboardIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
      <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
        {selectedAppId ? 'No allocations found' : 'Select an application to view allocations'}
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
        {selectedAppId
          ? 'Create a new allocation to get started.'
          : 'Use the dropdown above to choose an application.'}
      </Typography>
    </Box>
  );

  const renderBoardView = () => (
    <Box sx={{ overflowX: 'auto' }}>
      <Stack direction="row" spacing={2} sx={{ minWidth: servers.length * 300, pb: 2 }}>
        {servers.map((srv) => {
          const srvAllocs = allocationsByServer[srv.id] || [];
          return (
            <Paper
              key={srv.id}
              elevation={1}
              sx={{ minWidth: 280, maxWidth: 320, flexShrink: 0, p: 2 }}
            >
              {/* Server column header */}
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} noWrap>
                  {srv.serverName || srv.alias}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {srv.ipAddress}
                </Typography>
                <StatusChip status={srv.environment || srv.status} size="small" />
              </Stack>
              <Divider sx={{ mb: 1.5 }} />

              {/* Allocation cards */}
              {srvAllocs.length === 0 ? (
                <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center' }}>
                  No allocations
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {srvAllocs.map((alloc) => (
                    <Card
                      key={alloc.id}
                      variant="outlined"
                      sx={{
                        borderLeft: `4px solid ${getCardBorderColor(alloc)}`,
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: 3 },
                      }}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                          {alloc.serviceName}
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Instances: {alloc.totalInstances} planned
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">
                          {(alloc.instances || []).map((inst, idx) => (
                            <Tooltip
                              key={inst.id || idx}
                              title={`${inst.status || 'UNKNOWN'}`}
                            >
                              <FiberManualRecordIcon
                                sx={{
                                  fontSize: 12,
                                  color:
                                    inst.status === 'RUNNING' || inst.status === 'UP'
                                      ? '#4caf50'
                                      : '#f44336',
                                }}
                              />
                            </Tooltip>
                          ))}
                        </Stack>
                        {isOperator && (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                            <Tooltip title="Move">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setMoveTarget(alloc);
                                  setMoveServerId('');
                                }}
                              >
                                <MoveDownIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteTarget(alloc)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );

  const renderTableView = () => (
    <Box sx={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={allocations}
        columns={tableColumns}
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        disableRowSelectionOnClick
      />
    </Box>
  );

  return (
    <Box sx={{ p: 3, position: 'relative', minHeight: '80vh' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Allocation Board
      </Typography>

      {/* Top bar: App selector + view toggle + new allocation */}
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 3 }}
        flexWrap="wrap"
        useFlexGap
        alignItems="center"
      >
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

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="board">
            <Tooltip title="Board View">
              <ViewModuleIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="table">
            <Tooltip title="Table View">
              <TableChartIcon />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ flexGrow: 1 }} />

        {isOperator && selectedAppId && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewAllocOpen(true)}
          >
            New Allocation
          </Button>
        )}
      </Stack>

      {/* Content */}
      {loading ? (
        renderSkeletons()
      ) : !selectedAppId || allocations.length === 0 ? (
        selectedAppId && servers.length > 0 && viewMode === 'board' ? (
          renderBoardView()
        ) : (
          renderEmpty()
        )
      ) : viewMode === 'board' ? (
        renderBoardView()
      ) : (
        renderTableView()
      )}

      {/* ═══════════════════ DIALOGS ═══════════════════ */}

      {/* New Allocation Dialog */}
      <Dialog open={newAllocOpen} onClose={() => setNewAllocOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Allocation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Service"
              value={allocForm.serviceId}
              onChange={(e) => setAllocForm((f) => ({ ...f, serviceId: e.target.value }))}
              fullWidth
              required
            >
              {services.map((svc) => (
                <MenuItem key={svc.id} value={svc.id}>
                  {svc.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Server"
              value={allocForm.serverId}
              onChange={(e) => setAllocForm((f) => ({ ...f, serverId: e.target.value }))}
              fullWidth
              required
            >
              {servers.map((srv) => (
                <MenuItem key={srv.id} value={srv.id}>
                  {srv.serverName || srv.alias} ({srv.ipAddress})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Planned Instances"
              type="number"
              value={allocForm.plannedInstances}
              onChange={(e) =>
                setAllocForm((f) => ({ ...f, plannedInstances: e.target.value }))
              }
              fullWidth
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Deploy Path"
              value={allocForm.deployPath}
              onChange={(e) => setAllocForm((f) => ({ ...f, deployPath: e.target.value }))}
              fullWidth
              placeholder="/opt/services/my-service"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewAllocOpen(false)}>Cancel</Button>
          <Button onClick={handleNewAllocation} variant="contained" disabled={savingAlloc}>
            {savingAlloc ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Move Allocation Dialog */}
      <Dialog
        open={!!moveTarget}
        onClose={() => setMoveTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Move Allocation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            Move <strong>{moveTarget?.serviceName}</strong> to a different server.
          </Typography>
          <TextField
            select
            label="Target Server"
            value={moveServerId}
            onChange={(e) => setMoveServerId(e.target.value)}
            fullWidth
            required
          >
            {servers
              .filter((srv) => srv.id !== moveTarget?.serverId)
              .map((srv) => (
                <MenuItem key={srv.id} value={srv.id}>
                  {srv.serverName || srv.alias} ({srv.ipAddress})
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveTarget(null)}>Cancel</Button>
          <Button
            onClick={handleMove}
            variant="contained"
            disabled={moving || !moveServerId}
          >
            {moving ? 'Moving...' : 'Move'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Allocation"
        message={`Are you sure you want to remove the allocation of "${deleteTarget?.serviceName}" from this server? This will stop all associated instances.`}
        confirmText="Remove"
        severity="error"
        onConfirm={handleRemove}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
