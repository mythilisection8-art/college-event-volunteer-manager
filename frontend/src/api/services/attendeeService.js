import axiosClient from '../axiosClient';

export const attendeeService = {
  registerAsAttendee: async (eventId) => {
    return await axiosClient.post(`/attendees/${eventId}`);
  },

  cancelAttendeeRegistration: async (eventId) => {
    return await axiosClient.delete(`/attendees/${eventId}/cancel`);
  },

  getMyAttendingEvents: async () => {
    return await axiosClient.get('/attendees/my');
  },

  getEventAttendees: async (eventId) => {
    return await axiosClient.get(`/attendees/event/${eventId}`);
  },

  getAttendeePass: async (eventId) => {
    return await axiosClient.get(`/attendees/${eventId}/pass`);
  },

  getAttendeePassById: async (registrationId) => {
    return await axiosClient.get(`/attendees/pass/${registrationId}`);
  },

  verifyPass: async (data) => {
    return await axiosClient.post('/attendees/verify-pass', data);
  },

  checkInAttendee: async (registrationId, data = {}) => {
    return await axiosClient.post('/attendees/check-in', {
      registration_id: registrationId,
      ...data
    });
  },

  publicVerifyPass: async (params = {}) => {
    return await axiosClient.get('/attendees/public-verify', { params });
  },
};

