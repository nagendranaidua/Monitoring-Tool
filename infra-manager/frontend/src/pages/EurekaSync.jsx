import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Skeleton,
  Stack,
  Alert,
  AlertTitle,
  LinearProgress,
  FormControlLabel,
  Switch,
  Divider,
  Grid,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';
import { useSnackbar } from 'notistack';

import { useAuth } from '../context/AuthContext';
import {
  getApplication,
  getEurekaMismatches,
  syncEureka,
} from '../api/endpoints';

// ─── Mismatch severity map ──────────────────────────────────────────────────

const MISMATCH_SEVERITY = {
  CONFIGURED_NOT_REGISTERED: 'warning',
  REGISTERED_NOT_CONFIGURED: 'info',
  INSTANCE_COUNT_MISMATCH: 'warning',
};

const MISMATCH_LABEL = {
  CONFIGURED_NOT_REGISTERED: 'Configured but Not Registered',
  REGISTERED_NOT_CONFIGURED: 'Registered but Not Configured',
  INSTANCE_COUNT_MISMATCH: 'Instance Count Mismatch',
};

export default function EurekaSync() {
  const { appId } = useParams();
  const { isOperator } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [app, setApp] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [mismatches, setMismatches] = useState([]);
  const [mismatchesLoading, setMismatchesLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef(null);

  // ─── Fetch App ─────────────────────────────────────────────────────────

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

  // ─── Fetch Mismatches ──────────────────────────────────────────────────

  const fetchMismatches = useCallback(async () => {
    try {
      setMismatchesLoading(true);
      const res = await getEurekaMismatches(appId);
      setMismatches(res.data || []);
    } catch {
      enqueueSnackbar('Failed to load Eureka mismatches', { variant: 'error' });
    } finally {
      setMismatchesLoading(false);
    }
  }, [appId, enqueueSnackbar]);

  useEffect(() => {
    if (app) fetchMismatches();
  }, [app, fetchMismatches]);

  // ─── Auto-refresh ──────────────────────────────────────────────────────

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchMismatches, 30000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchMismatches]);

  // ─── Sync Handler ─────────────────────────────────────────────────────

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

  // ─── Summary counts ───────────────────────────────────────────────────

  const totalMismatches = mismatches.length;
  const configuredNotRegistered = mismatches.filter(
    (m) => m.type === 'CONFIGURED_NOT_REGISTERED'
  ).length;
  const registeredNotConfigured = mismatches.filter(
    (m) => m.type === 'REGISTERED_NOT_CONFIGURED'
  ).length;
  const instanceCountMismatch = mismatches.filter(
    (m) => m.type === 'INSTANCE_COUNT_MISMATCH'
  ).length;

  // ─── Render ────────────────────────────────────────────────────────────

  if (appLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton width={300} height={40} />
        <Skeleton width={500} height={24} sx={{ mt: 1 }} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 3, borderRadius: 1 }} />
      </Box>
    );
  }

  if (!app) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 6 }}>
        <Typography variant="h5" color="text.secondary">
          Application not found
        </Typography>
      </Box>
    );
  }

  const summaryCards = [
    {
      label: 'Total Mismatches',
      value: totalMismatches,
      color: totalMismatches > 0 ? '#f44336' : '#4caf50',
      icon: totalMismatches > 0 ? <ErrorIcon /> : <CheckCircleIcon />,
    },
    {
      label: 'Configured Not Registered',
      value: configuredNotRegistered,
      color: configuredNotRegistered > 0 ? '#ff9800' : '#4caf50',
      icon: <WarningAmberIcon />,
    },
    {
      label: 'Registered Not Configured',
      value: registeredNotConfigured,
      color: registeredNotConfigured > 0 ? '#2196f3' : '#4caf50',
      icon: <InfoIcon />,
    },
    {
      label: 'Instance Count Mismatches',
      value: instanceCountMismatch,
      color: instanceCountMismatch > 0 ? '#ff9800' : '#4caf50',
      icon: <WarningAmberIcon />,
    },
  ];

  return (
    <Box sx={{ p: 3, minHeight: '80vh' }}>
      {/* Header */}
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Eureka Sync: {app.name}
      </Typography>
      {app.eurekaUrl && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Eureka URL: {app.eurekaUrl}
        </Typography>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <Card
              variant="outlined"
              sx={{ textAlign: 'center', py: 2, borderTop: `3px solid ${card.color}` }}
            >
              <CardContent sx={{ py: 1 }}>
                <Box sx={{ color: card.color, mb: 0.5 }}>{card.icon}</Box>
                <Typography variant="h4" fontWeight={700}>
                  {mismatchesLoading ? '--' : card.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {card.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Action bar */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center" flexWrap="wrap" useFlexGap>
        {isOperator && (
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync Status'}
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchMismatches}
          disabled={mismatchesLoading}
        >
          Refresh
        </Button>
        <FormControlLabel
          control={
            <Switch
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              size="small"
            />
          }
          label="Auto-refresh (30s)"
        />
      </Stack>

      {/* Mismatch list */}
      {(mismatchesLoading || syncing) && <LinearProgress sx={{ mb: 2 }} />}

      {!mismatchesLoading && !syncing && mismatches.length === 0 ? (
        <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />}>
          <AlertTitle>All in Sync</AlertTitle>
          All services are in sync with Eureka. No mismatches detected.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {mismatches.map((m, idx) => {
            const severity = MISMATCH_SEVERITY[m.type] || 'warning';
            const typeLabel = MISMATCH_LABEL[m.type] || (m.type || '').replace(/_/g, ' ');
            return (
              <Alert key={idx} severity={severity}>
                <AlertTitle>{typeLabel}</AlertTitle>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    <strong>Service:</strong> {m.serviceName || m.eurekaServiceName || 'Unknown'}
                    {m.serverAlias || m.serverName
                      ? ` on ${m.serverAlias || m.serverName}`
                      : ''}
                  </Typography>
                  {m.type === 'INSTANCE_COUNT_MISMATCH' && (
                    <Typography variant="body2">
                      Expected: {m.expectedCount} | Actual: {m.actualCount}
                    </Typography>
                  )}
                  {m.suggestion && (
                    <Typography
                      variant="body2"
                      sx={{ fontStyle: 'italic', color: 'text.secondary', mt: 0.5 }}
                    >
                      Suggestion: {m.suggestion}
                    </Typography>
                  )}
                </Stack>
              </Alert>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
