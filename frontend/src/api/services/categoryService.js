import axiosClient from '../axiosClient';

export const categoryService = {
  getCategories: async () => {
    return await axiosClient.get('/categories');
  },

  createCategory: async (categoryData) => {
    return await axiosClient.post('/categories', categoryData);
  },
};
