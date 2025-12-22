// backend/src/operations/assessments/builders/assessment-query.builder.ts
import { BaseQueryBuilder } from '../../../common/builders/base-query.builder';
import { Types } from 'mongoose';
import { User } from '../../../iam/users/schemas/user.schema';
import { QueryAssessmentDto } from '../dto/query-assessment.dto';
import { ClientResolverService } from '../../../iam/client-resolver/client-resolver.service';
import { Resource } from '../../../common/constants/permissions.constants';

export class AssessmentQueryBuilder extends BaseQueryBuilder {
    constructor(queryDto: QueryAssessmentDto, user: User, clientResolverService: ClientResolverService) {
        super(queryDto, user, clientResolverService, Resource.ASSESSMENT);
    }

    protected buildSearchFilters() {
        super.buildSearchFilters();
        const dto = this.queryDto as QueryAssessmentDto;

        if (dto.blockId) {
            this.filter.blockId = new Types.ObjectId(dto.blockId);
        }

        if (dto.status) {
            this.filter.status = dto.status;
        }

        // Offline Support: Delta Sync
        if (dto.updatedSince) {
            this.filter.updatedAt = { $gt: new Date(dto.updatedSince) };
        }
    }

    protected async applyVisibilityScope() {
        // Scope Inheritance: Filter by the denormalized clientId
        await super.applyVisibilityScope('clientId');
    }
}