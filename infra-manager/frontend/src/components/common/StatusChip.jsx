import React from 'react';
import { Chip } from '@mui/material';

const STATUS_COLORS = {
  RUNNING: '#4caf50',
  UP: '#4caf50',
  ACTIVE: '#4caf50',
  STOPPED: '#f44336',
  DOWN: '#f44336',
  INACTIVE: '#f44336',
  STARTING: '#ff9800',
  STOPPING: '#ff9800',
  UNKNOWN: '#9e9e9e',
  PLANNED: '#9e9e9e',
  ERROR: '#b71c1c',
};

export default function StatusChip({ status, size = 'small', ...props }) {
  const normalized = (status || 'UNKNOWN').toUpperCase();
  const color = STATUS_COLORS[normalized] || STATUS_COLORS.UNKNOWN;

  return (
    <Chip
      label={status || 'Unknown'}
      size={size}
      sx={{
        backgroundColor: color,
        color: '#fff',
        fontWeight: 600,
      }}
      {...props}
    />
  );
}
