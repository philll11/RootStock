import axiosServices from 'utils/axios';
import { Block, CreateBlockDto, UpdateBlockDto, BlockQuery } from '../../types/assets/block.types';

const BASE_URL = '/blocks';

export const getBlocks = async (params?: BlockQuery): Promise<Block[]> => {
  const response = await axiosServices.get<Block[]>(BASE_URL, {
    params
  });
  return response.data;
};

export const getBlock = async (id: string): Promise<Block> => {
  const response = await axiosServices.get<Block>(`${BASE_URL}/${id}`);
  return response.data;
};

export const createBlock = async (data: CreateBlockDto): Promise<Block> => {
  const { _id, ...payload } = data;
  const response = await axiosServices.post<Block>(BASE_URL, payload);
  return response.data;
};

export const updateBlock = async ({ id, data }: { id: string; data: UpdateBlockDto }): Promise<Block> => {
  const response = await axiosServices.patch<Block>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteBlock = async (id: string): Promise<void> => {
  await axiosServices.delete(`${BASE_URL}/${id}`);
};
