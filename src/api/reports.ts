import apiClient from './client';

export const reportsApi = {
    sendWeeklyReport: async (payload: { email: string }) => {
        const { data } = await apiClient.post('/reports/send-weekly', payload);
        return data;
    },
};
