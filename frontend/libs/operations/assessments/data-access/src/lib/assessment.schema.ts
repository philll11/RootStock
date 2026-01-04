import { z } from 'zod';
import { AssessmentStatus, AssessmentType } from './assessment.types';

export const assessmentSampleSchema = z.object({
  rowNumber: z.coerce.number().min(1, 'Row number must be positive'),
  totalFruit: z.coerce.number().min(0, 'Total fruit must be positive'),
  damagedFruit: z.coerce.number().min(0, 'Damaged fruit must be positive'),
});

export const assessmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(AssessmentType).nullable().refine((val) => val !== null, { message: 'Type is required' }),
  blockId: z.string().nullable().refine((val) => val !== null && val.length > 0, { message: 'Block is required' }),
  date: z.date({ message: 'Date is required' }),
  status: z.enum(AssessmentStatus).default(AssessmentStatus.PENDING),
  samples: z.array(assessmentSampleSchema).default([]),
  changeReason: z.string().optional(),
  __v: z.number().optional(),
});

export type AssessmentFormData = z.infer<typeof assessmentSchema>;
