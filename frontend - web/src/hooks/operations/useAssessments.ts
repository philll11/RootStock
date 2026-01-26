import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from 'api/operations/assessments';
import { Assessment, CreateAssessmentDto, UpdateAssessmentDto, AssessmentQueryParams } from 'types/operations/assessment.types';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';

export const ASSESSMENT_KEYS = {
  all: ['assessments'] as const,
  lists: () => [...ASSESSMENT_KEYS.all, 'list'] as const,
  list: (params: AssessmentQueryParams) => [...ASSESSMENT_KEYS.lists(), params] as const,
  details: () => [...ASSESSMENT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ASSESSMENT_KEYS.details(), id] as const
};

export const useGetAssessments = (params?: AssessmentQueryParams) => {
  const { can } = usePermission();

  return useQuery({
    queryKey: ASSESSMENT_KEYS.list(params || {}),
    queryFn: () => api.getAssessments(params),
    enabled: can(PERMISSIONS.ASSESSMENT_VIEW)
  });
};

export const useGetAssessment = (id: string) => {
  const { can } = usePermission();

  return useQuery({
    queryKey: ASSESSMENT_KEYS.detail(id),
    queryFn: () => api.getAssessment(id),
    enabled: !!id && can(PERMISSIONS.ASSESSMENT_VIEW)
  });
};

export const useCreateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssessmentDto) => api.createAssessment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.lists() });
    }
  });
};

export const useUpdateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssessmentDto }) => api.updateAssessment({ id, data }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.detail(variables.id) });
    }
  });
};

export const useDeleteAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteAssessment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.lists() });
    }
  });
};
