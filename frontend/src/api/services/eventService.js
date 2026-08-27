import axiosClient from '../axiosClient';

export const eventService = {
  getEvents: async (params = {}) => {
    return await axiosClient.get('/events', { params });
  },

  getEventById: async (id) => {
    return await axiosClient.get(`/events/${id}`);
  },

  createEvent: async (eventData) => {
    return await axiosClient.post('/events', eventData);
  },

  updateEvent: async (id, eventData) => {
    return await axiosClient.put(`/events/${id}`, eventData);
  },

  deleteEvent: async (id) => {
    return await axiosClient.delete(`/events/${id}`);
  },

  getOrganizerEvents: async () => {
    return await axiosClient.get('/events/organizer/my-events');
  },

  getRecommendations: async () => {
    return await axiosClient.get('/events/recommendations');
  },

  assignOrganizer: async (id, organizer_id) => {
    return await axiosClient.patch(`/events/${id}/assign-organizer`, { organizer_id });
  },

  verifyAnyPass: async (data) => {
    return await axiosClient.post('/events/verify-pass', data);
  },

  checkInAnyPass: async (data) => {
    return await axiosClient.post('/events/check-in-pass', data);
  },

  publicVerifyAnyPass: async (params = {}) => {
    return await axiosClient.get('/events/public-verify-pass', { params });
  },
};

