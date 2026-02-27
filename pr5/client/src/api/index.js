import axios from "axios";

const apiClient = axios.create({
    baseURL: "http://localhost:3000/api",
    headers: {
        "Content-Type": "application/json",
    },
});

export const api = {
    getUsers: async () => {
        const res = await apiClient.get("/users");
        return res.data;
    },
    createUser: async (user) => {
        const res = await apiClient.post("/users", user);
        return res.data;
    },
    updateUser: async (id, updates) => {
        const res = await apiClient.patch(`/users/${id}`, updates);
        return res.data;
    },
    deleteUser: async (id) => {
        await apiClient.delete(`/users/${id}`);
    },
};
