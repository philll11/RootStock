import axiosServices from 'utils/axios';
import { Variety, CreateVarietyDto, UpdateVarietyDto } from '../../types/master-data/variety.types';

const BASE_URL = '/varieties';

export const getVarieties = async () => {
  const response = await axiosServices.get<Variety[]>(BASE_URL);
  return response.data;
};

export const getVariety = async (id: string): Promise<Variety> => {
  const response = await axiosServices.get<Variety>(`${BASE_URL}/${id}`);
  return response.data;
};

export const createVariety = async (data: CreateVarietyDto) => {
  // We skip the global 409 handler because a 409 on create means "Duplicate" not "Version Conflict"
  // and we handle the error notification explicitly in the mutation.
  const { _id, ...payload } = data;
  const response = await axiosServices.post<Variety>(BASE_URL, payload, {
    skipGlobalErrorHandler: true
  } as any);
  return response.data;
};

export const updateVariety = async ({ id, data }: { id: string; data: UpdateVarietyDto }) => {
  const response = await axiosServices.patch<Variety>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteVariety = async (id: string) => {
  await axiosServices.delete(`${BASE_URL}/${id}`);
};
