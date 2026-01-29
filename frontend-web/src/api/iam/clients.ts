import axiosServices from 'utils/axios';
import { Client, CreateClientDto, UpdateClientDto } from '../../types/iam/client.types';

const BASE_URL = '/clients';

export const getClients = async (): Promise<Client[]> => {
  const response = await axiosServices.get<Client[]>(BASE_URL);
  return response.data;
};

export const getClient = async (id: string): Promise<Client> => {
  const response = await axiosServices.get<Client>(`${BASE_URL}/${id}`);
  return response.data;
};

// Helper for searching clients
export const searchClients = async (query: string): Promise<Client[]> => {
  const params = new URLSearchParams();
  if (query) params.append('name', query);
  const response = await axiosServices.get<Client[]>(
    `${BASE_URL}?${params.toString()}`
  );
  return response.data;
};

export const createClient = async (data: CreateClientDto): Promise<Client> => {
  // Strip _id (used for frontend scoping) before sending to backend if present
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...payload } = data;
  const response = await axiosServices.post<Client>(BASE_URL, payload);
  return response.data;
};

export const updateClient = async ({ id, data }: { id: string; data: UpdateClientDto }): Promise<Client> => {
  const response = await axiosServices.patch<Client>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteClient = async (id: string): Promise<void> => {
  await axiosServices.delete(`${BASE_URL}/${id}`);
};
