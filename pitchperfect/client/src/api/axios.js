import axios from 'axios';

let rawUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
if (rawUrl && !rawUrl.endsWith('/api')) {
    rawUrl = `${rawUrl.replace(/\/+$/, '')}/api`;
}
const API_BASE = rawUrl || '/api';

const api = axios.create({
    baseURL: API_BASE,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
