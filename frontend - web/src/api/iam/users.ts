import axiosServices from 'utils/axios';
import { User, UpdateUserDto, CreateUserDto } from '../../types/iam/user.types';

// --- API Functions ---

const BASE_URL = '/users';

export const getUser = async (id: string): Promise<User> => {
  const response = await axiosServices.get<User>(`${BASE_URL}/${id}`);
  return response.data;
};

export const getUsers = async (): Promise<User[]> => {
  const response = await axiosServices.get<User[]>(BASE_URL);
  return response.data;
};

export const createUser = async (data: CreateUserDto): Promise<User> => {
  const response = await axiosServices.post<User>(BASE_URL, data);
  return response.data;
};

export const updateUser = async ({ id, data, }: { id: string; data: UpdateUserDto;}) : Promise<User> => {
  const response = await axiosServices.patch<User>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await axiosServices.delete(`${BASE_URL}/${id}`);
};
