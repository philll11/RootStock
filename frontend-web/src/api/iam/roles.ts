import axiosServices from 'utils/axios';
import { Role, CreateRoleDto, UpdateRoleDto } from '../../types/iam/role.types';
// --- API Functions ---

const BASE_URL = '/roles';

export const getRoles = async (): Promise<Role[]> => {
  const response = await axiosServices.get<Role[]>(BASE_URL);
  return response.data;
};

export const getRole = async (id: string): Promise<Role> => {
  const response = await axiosServices.get<Role>(`${BASE_URL}/${id}`);
  return response.data;
};

export const createRole = async (data: CreateRoleDto): Promise<Role> => {
  const response = await axiosServices.post<Role>(BASE_URL, data);
  return response.data;
};

export const updateRole = async ({ id, data }: { id: string; data: UpdateRoleDto }): Promise<Role> => {
  const response = await axiosServices.patch<Role>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteRole = async (id: string): Promise<void> => {
  await axiosServices.delete(`${BASE_URL}/${id}`);
};