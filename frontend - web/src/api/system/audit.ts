import axios from 'utils/axios';
import { AuditEntry } from './audit.types';

export const getAuditHistory = async (resource: string, resourceId: string): Promise<AuditEntry[]> => {
    const response = await axios.get<AuditEntry[]>(`/system/audit/${resource}/${resourceId}`);
    return response.data;
};
