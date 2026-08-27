import axiosClient from '../axiosClient';

export const registrationService = {
  registerForEvent: async (eventId, data = {}) => {
    return await axiosClient.post(`/registrations/${eventId}`, data);
  },

  getMyRegistrations: async (params = {}) => {
    return await axiosClient.get('/registrations/my', { params });
  },

  cancelRegistration: async (id) => {
    return await axiosClient.delete(`/registrations/${id}/cancel`);
  },

  getEventRegistrations: async (eventId) => {
    return await axiosClient.get(`/registrations/event/${eventId}`);
  },

  updateRegistrationStatus: async (id, statusData) => {
    return await axiosClient.patch(`/registrations/${id}/status`, statusData);
  },

  updateAttendance: async (id, attendanceData) => {
    return await axiosClient.patch(`/registrations/${id}/attendance`, attendanceData);
  },

  getVolunteerPass: async (eventId) => {
    return await axiosClient.get(`/registrations/${eventId}/pass`);
  },

  getVolunteerPassById: async (registrationId) => {
    return await axiosClient.get(`/registrations/pass/${registrationId}`);
  },

  verifyVolunteerPass: async (data) => {
    return await axiosClient.post('/registrations/verify-pass', data);
  },

  checkInVolunteer: async (registrationId, data = {}) => {
    return await axiosClient.post('/registrations/check-in', {
      registration_id: registrationId,
      ...data
    });
  },

  publicVerifyVolunteerPass: async (params = {}) => {
    return await axiosClient.get('/registrations/public-verify', { params });
  },
};

