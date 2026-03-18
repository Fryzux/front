import axios from "axios";

const API_URL = "http://localhost:3020/api";

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('refreshToken');

            if (refreshToken) {
                try {
                    const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, {
                        headers: { Authorization: `Bearer ${refreshToken}` },
                        withCredentials: true
                    });

                    localStorage.setItem('accessToken', data.accessToken);
                    localStorage.setItem('refreshToken', data.refreshToken);

                    originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                    return apiClient(originalRequest);
                } catch (refreshErr) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login';
                    return Promise.reject(refreshErr);
                }
            } else {
                localStorage.removeItem('accessToken');
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export const api = {
    // Auth
    register: async (userData) => {
        const { data } = await apiClient.post("/auth/register", userData);
        return data;
    },
    login: async (credentials) => {
        const { data } = await apiClient.post("/auth/login", credentials);
        if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        return data;
    },
    getMe: async () => {
        const { data } = await apiClient.get("/auth/me");
        return data;
    },
    logout: async () => {
        try { await apiClient.post("/auth/logout"); } catch (_) {}
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },

    // Products
    getProducts: async () => {
        const { data } = await apiClient.get("/products");
        return data;
    },
    getProduct: async (id) => {
        const { data } = await apiClient.get(`/products/${id}`);
        return data;
    },
    createProduct: async (product) => {
        const { data } = await apiClient.post("/products", product);
        return data;
    },
    updateProduct: async (id, updates) => {
        const { data } = await apiClient.put(`/products/${id}`, updates);
        return data;
    },
    deleteProduct: async (id) => {
        await apiClient.delete(`/products/${id}`);
    },

    // Users (Admin only)
    getUsers: async () => {
        const { data } = await apiClient.get("/users");
        return data;
    },
    getUser: async (id) => {
        const { data } = await apiClient.get(`/users/${id}`);
        return data;
    },
    updateUser: async (id, updates) => {
        const { data } = await apiClient.put(`/users/${id}`, updates);
        return data;
    },
    blockUser: async (id) => {
        const { data } = await apiClient.delete(`/users/${id}`);
        return data;
    },
    unblockUser: async (id) => {
        const { data } = await apiClient.patch(`/users/${id}/unblock`);
        return data;
    },
};
