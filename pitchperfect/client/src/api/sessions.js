import api from './axios';
export { login, signup } from './auth';

export const createSession = async (formData) => {
    const response = await api.post('/sessions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const getSession = async (id) => {
    const response = await api.get(`/sessions/${id}`);
    return response.data;
};

export const getSessionReport = async (id) => {
    const response = await api.get(`/sessions/${id}/report`);
    return response.data;
};

export const getAllSessions = async () => {
    const response = await api.get('/sessions');
    return response.data;
};