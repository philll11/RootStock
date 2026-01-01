import { BaseEntity } from '@rootstock/shared/util';

export enum AssessmentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface AssessmentSample {
  rowNumber: number;
  totalFruit: number;
  damagedFruit: number;
}

export interface AssessmentSummary {
  totalSamples: number;
  totalFruit: number;
  totalDamaged: number;
  averageDamagePercentage: number;
}

export interface AssessmentAuditLog {
  userId: string;
  action: string;
  reason: string;
  previousSummary: AssessmentSummary;
  date: string;
}

export interface Assessment extends BaseEntity {
  blockId: string | { _id: string; name: string; recordId: string }; // Populated or ID
  clientId: string;
  varietyId: string | { _id: string; name: string }; // Populated or ID
  date: string; // ISO Date string
  status: AssessmentStatus;
  samples: AssessmentSample[];
  summary: AssessmentSummary;
  revisionHistory?: AssessmentAuditLog[];
}

export interface CreateAssessmentDto {
  blockId: string;
  date: Date;
  samples?: AssessmentSample[];
}

export interface UpdateAssessmentDto {
  status?: AssessmentStatus;
  samples?: AssessmentSample[];
  changeReason?: string;
  date?: Date;
  isActive?: boolean;
  __v: number;
}

export interface AssessmentQueryParams {
  blockId?: string;
  clientId?: string;
  status?: AssessmentStatus;
  startDate?: string;
  endDate?: string;
}
