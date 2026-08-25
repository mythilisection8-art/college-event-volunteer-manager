import axiosClient from '../axiosClient';

export const adminService = {
  getStats: async (params = {}) => {
    return await axiosClient.get('/admin/stats', { params });
  },

  getUsers: async (params = {}) => {
    return await axiosClient.get('/admin/users', { params });
  },

  createUser: async (userData) => {
    return await axiosClient.post('/admin/users', userData);
  },

  updateUserStatus: async (id, status) => {
    return await axiosClient.patch(`/admin/users/${id}/status`, { status });
  },

  updateUserRole: async (id, role) => {
    return await axiosClient.patch(`/admin/users/${id}/role`, { role });
  },

  deleteUser: async (id) => {
    return await axiosClient.delete(`/admin/users/${id}`);
  },

  getAllRegistrations: async (params = {}) => {
    return await axiosClient.get('/admin/registrations', { params });
  },
};
