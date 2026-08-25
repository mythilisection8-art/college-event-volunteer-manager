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
};
