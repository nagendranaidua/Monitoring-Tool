import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Stack,
  Skeleton,
  Collapse,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HistoryIcon from '@mui/icons-material/History';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

import { useAuth } from '../context/AuthContext';
import { getAuditLog } from '../api/endpoints';

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'START', 'STOP', 'MOVE', 'RESTORE'];
const ENTITY_TYPES = [
  '',
  'APPLICATION',
  'SERVER',
  'SERVICE',
  'ALLOCATION',
  'INSTANCE',
  'SNAPSHOT',
  'USER',
];

export default function AuditLog() {
  const { isAdmin } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Data
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  // Filters
  const [filters, setFilters] = useState({
    username: '',
    action: '',
    entityType: '',
    fromDate: '',
    toDate: '',
  });

  // Expanded row
  const [expandedRowId, setExpandedRowId] = useState(null);

  // ─── Fetch ─────────────────────────────────────────────────────────────

  const fetchAuditLog = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: paginationModel.page,
        size: paginationModel.pageSize,
      };
      if (filters.username) params.username = filters.username;
      if (filters.action) params.action = filters.action;
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.fromDate) params.fromDate = filters.fromDate;
      if (filters.toDate) params.toDate = filters.toDate;

      const res = await getAuditLog(params);
      // Support both paginated and flat responses
      if (res.data.content) {
        setRows(res.data.content);
        setTotalRows(res.data.totalElements || res.data.content.length);
      } else if (Array.isArray(res.data)) {
        setRows(res.data);
        setTotalRows(res.data.length);
      } else {
        setRows([]);
        setTotalRows(0);
      }
    } catch {
      enqueueSnackbar('Failed to load audit log', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [paginationModel, filters, enqueueSnackbar]);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleFilterChange = (field) => (e) => {
    setFilters((f) => ({ ...f, [field]: e.target.value }));
    setPaginationModel((m) => ({ ...m, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ username: '', action: '', entityType: '', fromDate: '', toDate: '' });
    setPaginationModel((m) => ({ ...m, page: 0 }));
  };

  const handleExportCsv = () => {
    if (rows.length === 0) {
      enqueueSnackbar('No data to export', { variant: 'info' });
      return;
    }
    const headers = ['Timestamp', 'Username', 'Action', 'Entity Type', 'Entity ID', 'IP Address'];
    const csvRows = rows.map((r) =>
      [
        formatDate(r.timestamp || r.createdAt),
        r.username || '',
        r.action || '',
        r.entityType || '',
        r.entityId || '',
        r.ipAddress || '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_log_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleRow = (id) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
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

  const formatJson = (data) => {
    if (!data) return 'N/A';
    try {
      if (typeof data === 'string') data = JSON.parse(data);
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  // ─── DataGrid Columns ─────────────────────────────────────────────────

  const columns = [
    {
      field: 'expand',
      headerName: '',
      width: 50,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={() => toggleRow(params.row.id)}>
          {expandedRowId === params.row.id ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </IconButton>
      ),
    },
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      flex: 1,
      minWidth: 170,
      valueGetter: (params) => params.row.timestamp || params.row.createdAt,
      renderCell: (params) => (
        <Typography variant="body2">
          {formatDate(params.row.timestamp || params.row.createdAt)}
        </Typography>
      ),
    },
    { field: 'username', headerName: 'Username', flex: 0.8, minWidth: 120 },
    { field: 'action', headerName: 'Action', flex: 0.6, minWidth: 100 },
    { field: 'entityType', headerName: 'Entity Type', flex: 0.8, minWidth: 120 },
    { field: 'entityId', headerName: 'Entity ID', flex: 0.5, minWidth: 80 },
    { field: 'ipAddress', headerName: 'IP Address', flex: 0.8, minWidth: 130 },
  ];

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3, minHeight: '80vh' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Audit Log
      </Typography>

      {/* Filter bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
          <FilterListIcon color="action" />
          <TextField
            label="Username"
            size="small"
            value={filters.username}
            onChange={handleFilterChange('username')}
            sx={{ minWidth: 140 }}
          />
          <TextField
            select
            label="Action"
            size="small"
            value={filters.action}
            onChange={handleFilterChange('action')}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="">All</MenuItem>
            {ACTIONS.filter(Boolean).map((a) => (
              <MenuItem key={a} value={a}>
                {a}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Entity Type"
            size="small"
            value={filters.entityType}
            onChange={handleFilterChange('entityType')}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            {ENTITY_TYPES.filter(Boolean).map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="From"
            type="date"
            size="small"
            value={filters.fromDate}
            onChange={handleFilterChange('fromDate')}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={filters.toDate}
            onChange={handleFilterChange('toDate')}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <Button size="small" onClick={handleClearFilters}>
            Clear
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Export CSV">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportCsv}
              size="small"
            >
              Export
            </Button>
          </Tooltip>
        </Stack>
      </Paper>

      {/* DataGrid with expandable rows */}
      {loading && rows.length === 0 ? (
        <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 1 }} />
      ) : rows.length === 0 && !loading ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <HistoryIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            No audit log entries found
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Adjust your filters or wait for activity.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            rowCount={totalRows}
            loading={loading}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50, 100]}
            disableRowSelectionOnClick
            getRowHeight={() => 'auto'}
            sx={{
              minHeight: 500,
              '& .MuiDataGrid-cell': { py: 1 },
            }}
          />

          {/* Expanded row detail */}
          {expandedRowId && (
            <Collapse in={!!expandedRowId} timeout="auto">
              <Paper variant="outlined" sx={{ p: 2, mt: 1, mb: 2 }}>
                {(() => {
                  const row = rows.find((r) => r.id === expandedRowId);
                  if (!row) return null;
                  return (
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Before State
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            p: 1.5,
                            backgroundColor: 'grey.100',
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            overflow: 'auto',
                            maxHeight: 300,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {formatJson(row.beforeState)}
                        </Box>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          After State
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            p: 1.5,
                            backgroundColor: 'grey.100',
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            overflow: 'auto',
                            maxHeight: 300,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {formatJson(row.afterState)}
                        </Box>
                      </Box>
                    </Stack>
                  );
                })()}
              </Paper>
            </Collapse>
          )}
        </Box>
      )}
    </Box>
  );
}
