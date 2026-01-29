import { BaseEntity } from 'types/models';

export enum AssessmentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum AssessmentType {
  HAIL = 'HAIL',
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
  name: string;
  type: AssessmentType;
  blockId: { _id: string; name: string; recordId: string };
  clientId: { _id: string; name: string; recordId: string };
  varietyId: { _id: string; name: string; recordId: string };
  date: string; // ISO Date string
  status: AssessmentStatus;
  samples: AssessmentSample[];
  summary: AssessmentSummary;
  revisionHistory?: AssessmentAuditLog[];
}

export interface CreateAssessmentDto {
  name: string;
  type: AssessmentType;
  blockId: string;
  date: Date;
  samples?: AssessmentSample[];
}

export interface UpdateAssessmentDto {
  name?: string;
  type?: AssessmentType;
  blockId?: string;
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
  updatedSince?: string;
  startDate?: string;
  endDate?: string;
}
