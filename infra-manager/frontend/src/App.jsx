import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/common/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ApplicationDetail from './pages/ApplicationDetail';
import ServerDetail from './pages/ServerDetail';
import ServiceRegistry from './pages/ServiceRegistry';
import AllocationBoard from './pages/AllocationBoard';
import EurekaSync from './pages/EurekaSync';
import Snapshots from './pages/Snapshots';
import UserManagement from './pages/UserManagement';
import AuditLog from './pages/AuditLog';
import ExcelImport from './pages/ExcelImport';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/apps/:id" element={<ApplicationDetail />} />
        <Route path="/apps/:id/servers/:serverId" element={<ServerDetail />} />
        <Route path="/services" element={<ServiceRegistry />} />
        <Route path="/allocations" element={<AllocationBoard />} />
        <Route path="/eureka/:appId" element={<EurekaSync />} />
        <Route path="/snapshots" element={<Snapshots />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/import"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <ExcelImport />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
