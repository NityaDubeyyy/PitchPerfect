import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const createSession = async (formData) => {
    const response = await axios.post(`${API_BASE}/sessions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const getSession = async (id) => {
    const response = await axios.get(`${API_BASE}/sessions/${id}`);
    return response.data;
};

export const getSessionReport = async (id) => {
    const response = await axios.get(`${API_BASE}/sessions/${id}/report`);
    return response.data;
};

export const getAllSessions = async () => {
    const response = await axios.get(`${API_BASE}/sessions`);
    return response.data;
};