import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Assessment, AssessmentQueryParams, CreateAssessmentDto, UpdateAssessmentDto } from './assessment.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { v4 as uuid } from 'uuid';

const BASE_URL = '/assessments';

export const ASSESSMENTS_KEYS = {
  all: ['assessments'] as const,
  lists: () => [...ASSESSMENTS_KEYS.all, 'list'] as const,
  list: (params: AssessmentQueryParams) => [...ASSESSMENTS_KEYS.lists(), params] as const,
  details: () => [...ASSESSMENTS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ASSESSMENTS_KEYS.details(), id] as const,
};

// API Functions
export const getAssessments = async (params?: AssessmentQueryParams): Promise<Assessment[]> => {
  const response = await apiClient.get<Assessment[]>(BASE_URL, { params });
  return response.data;
};

export const getAssessment = async (id: string): Promise<Assessment> => {
  const response = await apiClient.get<Assessment>(`${BASE_URL}/${id}`);
  return response.data;
};

export const createAssessment = async (data: CreateAssessmentDto): Promise<Assessment> => {
  const response = await apiClient.post<Assessment>(BASE_URL, data);
  return response.data;
};

export const updateAssessment = async ({ id, data }: { id: string; data: UpdateAssessmentDto }): Promise<Assessment> => {
  const response = await apiClient.patch<Assessment>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteAssessment = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/${id}`);
};

// Hooks
export const useGetAssessments = (params?: AssessmentQueryParams) => {
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.ASSESSMENT_VIEW);

  return useQuery({
    queryKey: ASSESSMENTS_KEYS.list(params || {}),
    queryFn: () => getAssessments(params),
    enabled: isEnabled,
  });
};

export const useGetAssessment = (id: string) => {
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.ASSESSMENT_VIEW) && !!id;

  return useQuery({
    queryKey: ASSESSMENTS_KEYS.detail(id),
    queryFn: () => getAssessment(id),
    enabled: isEnabled,
  });
};

export const useCreateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAssessment,
    onMutate: async (newAssessment) => {
      await queryClient.cancelQueries({ queryKey: ASSESSMENTS_KEYS.lists() });

      const previousAssessmentsAll = queryClient.getQueryData<Assessment[]>(ASSESSMENTS_KEYS.list({}));
      const previousAssessmentsBlock = queryClient.getQueryData<Assessment[]>(ASSESSMENTS_KEYS.list({ blockId: newAssessment.blockId }));

      const tempAssessment: Assessment = {
        ...newAssessment,
        _id: uuid(),
        recordId: 'TEMP',
        clientId: 'PENDING',
        varietyId: 'PENDING',
        status: 'PENDING' as any,
        summary: {
          totalSamples: 0,
          totalFruit: 0,
          totalDamaged: 0,
          averageDamagePercentage: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        isDeleted: false,
        __v: 0,
      } as any;

      if (previousAssessmentsAll) {
        queryClient.setQueryData<Assessment[]>(ASSESSMENTS_KEYS.list({}), [
          tempAssessment,
          ...previousAssessmentsAll,
        ]);
      }

      if (previousAssessmentsBlock) {
        queryClient.setQueryData<Assessment[]>(ASSESSMENTS_KEYS.list({ blockId: newAssessment.blockId }), [
          tempAssessment,
          ...previousAssessmentsBlock,
        ]);
      }

      return { previousAssessmentsAll, previousAssessmentsBlock };
    },
    onError: (err, newAssessment, context) => {
      if (context?.previousAssessmentsAll) {
        queryClient.setQueryData(ASSESSMENTS_KEYS.list({}), context.previousAssessmentsAll);
      }
      if (context?.previousAssessmentsBlock) {
        queryClient.setQueryData(ASSESSMENTS_KEYS.list({ blockId: newAssessment.blockId }), context.previousAssessmentsBlock);
      }
      notify.error(err, 'Error Creating Assessment');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ASSESSMENTS_KEYS.lists() });
    },
    onSuccess: () => {
      notify.success('The assessment has been successfully created.', 'Assessment Created');
    },
  });
};

export const useUpdateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAssessment,
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ASSESSMENTS_KEYS.all });

      const previousAssessment = queryClient.getQueryData<Assessment>(ASSESSMENTS_KEYS.detail(id));
      const previousAssessmentsAll = queryClient.getQueryData<Assessment[]>(ASSESSMENTS_KEYS.list({}));

      if (previousAssessment) {
        queryClient.setQueryData(ASSESSMENTS_KEYS.detail(id), {
          ...previousAssessment,
          ...data,
        });
      }

      if (previousAssessmentsAll) {
        queryClient.setQueryData(
          ASSESSMENTS_KEYS.list({}),
          previousAssessmentsAll.map((assessment) =>
            assessment._id === id ? { ...assessment, ...data } : assessment
          )
        );
      }

      return { previousAssessment, previousAssessmentsAll };
    },
    onError: (err, variables, context) => {
      if (context?.previousAssessment) {
        queryClient.setQueryData(ASSESSMENTS_KEYS.detail(variables.id), context.previousAssessment);
      }
      if (context?.previousAssessmentsAll) {
        queryClient.setQueryData(ASSESSMENTS_KEYS.list({}), context.previousAssessmentsAll);
      }
      notify.error(err, 'Error Updating Assessment');
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ASSESSMENTS_KEYS.all });
    },
    onSuccess: () => {
      notify.success('The assessment details have been updated.', 'Assessment Updated');
    },
  });
};

export const useDeleteAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAssessment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSESSMENTS_KEYS.lists() });
      notify.success('The assessment has been deleted.', 'Assessment Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting Assessment');
    },
  });
};
