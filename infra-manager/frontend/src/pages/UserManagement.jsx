import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Chip,
  Skeleton,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

import { useAuth } from '../context/AuthContext';
import StatusChip from '../components/common/StatusChip';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getUsers, createUser, updateUser, deleteUser } from '../api/endpoints';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLES = ['ADMIN', 'OPERATOR', 'VIEWER'];

const ROLE_COLORS = {
  ADMIN: '#7b1fa2',
  OPERATOR: '#1976d2',
  VIEWER: '#757575',
};

const EMPTY_FORM = {
  username: '',
  password: '',
  email: '',
  fullName: '',
  role: 'VIEWER',
};

export default function UserManagement() {
  const { isAdmin } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ─── Fetch ─────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getUsers();
      setUsers(res.data);
    } catch {
      enqueueSnackbar('Failed to load users', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const openAddDialog = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (user) => {
    setEditingUser(user);
    setForm({
      username: user.username || '',
      password: '',
      email: user.email || '',
      fullName: user.fullName || '',
      role: user.role || 'VIEWER',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.username.trim()) {
      enqueueSnackbar('Username is required', { variant: 'warning' });
      return;
    }
    if (!editingUser && !form.password.trim()) {
      enqueueSnackbar('Password is required for new users', { variant: 'warning' });
      return;
    }
    try {
      setSaving(true);
      const payload = { ...form };
      if (editingUser && !payload.password) {
        delete payload.password;
      }
      if (editingUser) {
        await updateUser(editingUser.id, payload);
        enqueueSnackbar('User updated', { variant: 'success' });
      } else {
        await createUser(payload);
        enqueueSnackbar('User created', { variant: 'success' });
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save user', {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      enqueueSnackbar('User deleted', { variant: 'success' });
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to delete user', {
        variant: 'error',
      });
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  // ─── DataGrid Columns ─────────────────────────────────────────────────

  const columns = [
    { field: 'username', headerName: 'Username', flex: 1, minWidth: 130 },
    { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 180 },
    { field: 'fullName', headerName: 'Full Name', flex: 1, minWidth: 150 },
    {
      field: 'role',
      headerName: 'Role',
      flex: 0.7,
      minWidth: 110,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            backgroundColor: ROLE_COLORS[params.value] || ROLE_COLORS.VIEWER,
            color: '#fff',
            fontWeight: 600,
          }}
        />
      ),
    },
    {
      field: 'active',
      headerName: 'Active',
      flex: 0.6,
      minWidth: 90,
      renderCell: (params) => (
        <StatusChip status={params.value ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
    {
      field: 'lastLogin',
      headerName: 'Last Login',
      flex: 1,
      minWidth: 160,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(params.value)}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.6,
      minWidth: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) =>
        isAdmin ? (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => openEditDialog(params.row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteTarget(params.row)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : null,
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3, minHeight: '80vh' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        User Management
      </Typography>

      {/* Top bar */}
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>
            Add User
          </Button>
        )}
      </Stack>

      {/* DataGrid */}
      {loading ? (
        <Box>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
        </Box>
      ) : users.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <PeopleIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            No users found
          </Typography>
        </Box>
      ) : (
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={users}
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            disableRowSelectionOnClick
          />
        </Box>
      )}

      {/* ═══════════════════ DIALOGS ═══════════════════ */}

      {/* Add / Edit User Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
              fullWidth
              autoFocus
              disabled={!!editingUser}
            />
            <TextField
              label={editingUser ? 'Password (leave blank to keep)' : 'Password'}
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required={!editingUser}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Full Name"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="Role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              fullWidth
            >
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={r}
                      size="small"
                      sx={{
                        backgroundColor: ROLE_COLORS[r],
                        color: '#fff',
                        fontWeight: 600,
                      }}
                    />
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        message={`Are you sure you want to delete user "${deleteTarget?.username}"? This action cannot be undone.`}
        confirmText="Delete"
        severity="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
