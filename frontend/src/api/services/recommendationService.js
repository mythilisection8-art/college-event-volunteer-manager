import axiosClient from '../axiosClient';

export const recommendationService = {
  getPersonalizedRecommendations: async () => {
    return await axiosClient.get('/events/recommendations');
  }
};
