import axiosServices from 'utils/axios';
import { Assessment, CreateAssessmentDto, UpdateAssessmentDto, AssessmentQueryParams } from '../../types/operations/assessment.types';

const BASE_URL = '/assessments';

export const getAssessments = async (params?: AssessmentQueryParams): Promise<Assessment[]> => {
  const response = await axiosServices.get<Assessment[]>(BASE_URL, { params });
  return response.data;
};

export const getAssessment = async (id: string): Promise<Assessment> => {
  const response = await axiosServices.get<Assessment>(`${BASE_URL}/${id}`);
  return response.data;
};

export const createAssessment = async (data: CreateAssessmentDto): Promise<Assessment> => {
  const response = await axiosServices.post<Assessment>(BASE_URL, data);
  return response.data;
};

export const updateAssessment = async ({ id, data }: { id: string; data: UpdateAssessmentDto }): Promise<Assessment> => {
  const response = await axiosServices.patch<Assessment>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteAssessment = async (id: string): Promise<void> => {
  await axiosServices.delete(`${BASE_URL}/${id}`);
};