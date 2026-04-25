import client from './client';

// Auth
export const login = (data) => client.post('/auth/login', data);
export const getMe = () => client.get('/auth/me');

// Applications
export const getApplications = () => client.get('/applications');
export const getApplication = (id) => client.get(`/applications/${id}`);
export const createApplication = (data) => client.post('/applications', data);
export const updateApplication = (id, data) => client.put(`/applications/${id}`, data);
export const deleteApplication = (id) => client.delete(`/applications/${id}`);

// Servers
export const getServers = (appId) => client.get(`/applications/${appId}/servers`);
export const getServer = (id) => client.get(`/servers/${id}`);
export const createServer = (appId, data) => client.post(`/applications/${appId}/servers`, data);
export const updateServer = (id, data) => client.put(`/servers/${id}`, data);
export const deleteServer = (id) => client.delete(`/servers/${id}`);
export const filterServers = (appId, data) => client.post(`/servers/filter?appId=${appId}`, data);
export const getFilterOptions = (appId) => client.get(`/servers/filter-options?appId=${appId}`);
export const healthCheck = (id) => client.post(`/servers/${id}/health-check`);

// Services (Microservices)
export const getServices = (appId) => client.get(`/services?applicationId=${appId}`);
export const getService = (id) => client.get(`/services/${id}`);
export const createService = (data) => client.post('/services', data);
export const updateService = (id, data) => client.put(`/services/${id}`, data);
export const deleteService = (id) => client.delete(`/services/${id}`);

// Allocations
export const getAllocationsByServer = (serverId) => client.get(`/allocations?serverId=${serverId}`);
export const getAllocationsByService = (serviceId) => client.get(`/allocations?serviceId=${serviceId}`);
export const createAllocation = (data) => client.post('/allocations', data);
export const removeAllocation = (id) => client.delete(`/allocations/${id}`);
export const moveAllocation = (id, data) => client.put(`/allocations/${id}/move`, data);

// Instances
export const getInstances = (allocationId) => client.get(`/instances?allocationId=${allocationId}`);
export const startInstance = (id) => client.post(`/instances/${id}/start`);
export const stopInstance = (id) => client.post(`/instances/${id}/stop`);
export const moveInstance = (id, data) => client.put(`/instances/${id}/move`, data);
export const getInstanceStatus = (id) => client.get(`/instances/${id}/status`);

// Eureka
export const getEurekaMismatches = (appId) => client.get(`/eureka/mismatches/${appId}`);
export const syncEureka = (appId) => client.post(`/eureka/sync/${appId}`);
export const discoverServicesFromEureka = (appId) => client.post(`/eureka/discover/${appId}`);

// Snapshots
export const getSnapshots = (appId) => client.get(`/snapshots?applicationId=${appId}`);
export const createSnapshot = (data) => client.post('/snapshots', data);
export const restoreSnapshot = (id) => client.post(`/snapshots/${id}/restore`);
export const getSnapshotDiff = (id) => client.get(`/snapshots/${id}/diff`);

// Audit
export const getAuditLog = (params) => client.get('/audit', { params });

// Users
export const getUsers = () => client.get('/users');
export const createUser = (data) => client.post('/users', data);
export const updateUser = (id, data) => client.put(`/users/${id}`, data);
export const deleteUser = (id) => client.delete(`/users/${id}`);

// Import
export const importExcel = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return client.post('/import/excel', fd);
};
