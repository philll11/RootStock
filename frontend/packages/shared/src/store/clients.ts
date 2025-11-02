// frontend/packages/shared/src/store/clients.ts

import { create } from 'zustand';
import type { Client } from '../types'; // Use 'type' for type-only imports
import apiClient from '../api';

// Define the shape of our store's state
interface ClientState {
    clients: Client[];
    isLoading: boolean;
    error: string | null;
    fetchClients: () => Promise<void>;
}

export const useClientsStore = create<ClientState>((set) => ({
    // Initial state
    clients: [],
    isLoading: false,
    error: null,

    // The function that performs the async operation
    fetchClients: async () => {
        // Set loading state and clear any previous errors
        set({ isLoading: true, error: null });
        try {
            // Use our configured apiClient to make the network request
            const response = await apiClient.get<Client[]>('/clients');
            // On success, update the state with the fetched data
            set({ clients: response.data, isLoading: false });
        } catch (err) {
            // On failure, update the state with an error message
            set({ error: 'Failed to fetch clients', isLoading: false, clients: [] });
        }
    },
}));