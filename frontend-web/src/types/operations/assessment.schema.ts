import { z } from 'zod';
import { AssessmentStatus, AssessmentType } from './assessment.types';

export const assessmentSampleSchema = z.object({
  rowNumber: z.number().min(1, 'Row number must be positive'),
  totalFruit: z.number().min(0, 'Total fruit must be positive'),
  damagedFruit: z.number().min(0, 'Damaged fruit must be positive'),
});

export const assessmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(AssessmentType),
  blockId: z.string().min(1, 'Block is required'),
  date: z.date({ message: 'Date is required' }),
  status: z.enum(AssessmentStatus).optional(),
  samples: z.array(assessmentSampleSchema),
  changeReason: z.string().optional(),
  isActive: z.boolean().optional(),
  __v: z.number().optional(),
});

export type AssessmentFormData = z.infer<typeof assessmentSchema>;
