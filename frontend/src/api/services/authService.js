import axiosClient from '../axiosClient';

export const authService = {
  login: async (credentials) => {
    return await axiosClient.post('/auth/login', credentials);
  },

  register: async (userData) => {
    return await axiosClient.post('/auth/register', userData);
  },

  getMe: async () => {
    return await axiosClient.get('/auth/me');
  },

  updateProfile: async (profileData) => {
    return await axiosClient.put('/auth/profile', profileData);
  },

  changePassword: async (passwordData) => {
    return await axiosClient.put('/auth/change-password', passwordData);
  },
};
