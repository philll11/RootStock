import axiosServices from 'utils/axios';
import { Orchard, CreateOrchardDto, UpdateOrchardDto, OrchardQuery } from '../../types/assets/orchard.types';

const BASE_URL = '/orchards';

export const getOrchards = async (params?: OrchardQuery): Promise<Orchard[]> => {
    const response = await axiosServices.get<Orchard[]>(BASE_URL, { params });
    return response.data;
};

export const getOrchard = async (id: string): Promise<Orchard> => {
    const response = await axiosServices.get<Orchard>(`${BASE_URL}/${id}`);
    return response.data;
};

export const createOrchard = async (data: CreateOrchardDto): Promise<Orchard> => {
    const response = await axiosServices.post<Orchard>(BASE_URL, data);
    return response.data;
};

export const updateOrchard = async ({ id, data }: { id: string; data: UpdateOrchardDto }): Promise<Orchard> => {
    const response = await axiosServices.patch<Orchard>(`${BASE_URL}/${id}`, data);
    return response.data;
};

export const deleteOrchard = async (id: string): Promise<void> => {
    await axiosServices.delete(`${BASE_URL}/${id}`);
};
