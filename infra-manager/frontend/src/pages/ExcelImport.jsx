import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useSnackbar } from 'notistack';

import { useAuth } from '../context/AuthContext';
import { importExcel } from '../api/endpoints';

export default function ExcelImport() {
  const { isAdmin } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith('.xlsx')) {
      enqueueSnackbar('Only .xlsx files are accepted', { variant: 'warning' });
      return;
    }
    setFile(selectedFile);
    setResult(null);
  };

  const handleInputChange = (e) => {
    handleFileSelect(e.target.files?.[0]);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    handleFileSelect(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleImport = async () => {
    if (!file) {
      enqueueSnackbar('Please select a file first', { variant: 'warning' });
      return;
    }
    try {
      setImporting(true);
      setResult(null);
      const res = await importExcel(file);
      setResult(res.data);
      enqueueSnackbar('Import completed', { variant: 'success' });
    } catch (err) {
      const errData = err.response?.data;
      if (errData) {
        setResult({ error: true, message: errData.message || 'Import failed', ...errData });
      }
      enqueueSnackbar(errData?.message || 'Import failed', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  // ─── Render ────────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 6 }}>
        <Typography variant="h5" color="text.secondary">
          Access Denied
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
          Only administrators can import data.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, minHeight: '80vh', maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Excel Import
      </Typography>

      {/* Warning banner */}
      <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningAmberIcon />}>
        <AlertTitle>One-time Seed Operation</AlertTitle>
        This is a one-time seed operation. Existing data will not be affected.
      </Alert>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Instructions</AlertTitle>
        Upload your infrastructure Excel file. Each sheet will become an application, each row a
        server. Only <strong>.xlsx</strong> files are accepted.
      </Alert>

      {/* Upload zone */}
      <Paper
        variant="outlined"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        sx={{
          p: 4,
          mb: 3,
          textAlign: 'center',
          cursor: 'pointer',
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: dragOver ? 'primary.main' : 'divider',
          backgroundColor: dragOver ? 'action.hover' : 'transparent',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.light',
            backgroundColor: 'action.hover',
          },
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          hidden
          onChange={handleInputChange}
        />
        <CloudUploadIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">
          Drag and drop your .xlsx file here
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
          or click to browse
        </Typography>
        <Button variant="outlined" startIcon={<UploadFileIcon />} component="span">
          Select File
        </Button>
      </Paper>

      {/* File preview */}
      {file && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <InsertDriveFileIcon color="primary" sx={{ fontSize: 40 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {file.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatFileSize(file.size)}
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <UploadFileIcon />}
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? 'Importing...' : 'Import'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Result display */}
      {result && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Import Results
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {result.error ? (
              <Alert severity="error">
                <AlertTitle>Import Failed</AlertTitle>
                {result.message || 'An error occurred during import.'}
              </Alert>
            ) : (
              <>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={`${result.applicationsImported ?? result.applicationCount ?? 0} Applications`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={`${result.serversImported ?? result.serverCount ?? 0} Servers`}
                    color="success"
                    variant="outlined"
                  />
                </Stack>

                {result.message && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {result.message}
                  </Alert>
                )}

                {/* Errors list */}
                {(result.errors || []).length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Errors ({result.errors.length})
                    </Typography>
                    <List dense>
                      {result.errors.map((err, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <ErrorOutlineIcon color="error" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={typeof err === 'string' ? err : err.message || JSON.stringify(err)}
                            secondary={err.row ? `Row ${err.row}` : null}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Warnings list */}
                {(result.warnings || []).length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                      Warnings ({result.warnings.length})
                    </Typography>
                    <List dense>
                      {result.warnings.map((warn, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <WarningAmberIcon color="warning" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={typeof warn === 'string' ? warn : warn.message || JSON.stringify(warn)}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
