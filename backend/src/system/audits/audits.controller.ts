import { Controller, Get, Param, UseGuards, UseFilters } from '@nestjs/common';
import { AuditsService } from './audits.service';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { MongoExceptionFilter } from '../../common/filters/mongo-exception.filter';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../iam/users/schemas/user.schema';

@Controller('system/audit')
@UseFilters(MongoExceptionFilter)
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get(':resource/:id')
  @RequirePermission(PERMISSIONS.AUDIT_VIEW)
  async getHistory(
    @Param('resource') resource: string,
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() requestingUser: UserDocument,
  ) {
    return this.auditsService.getHistory(resource, id, requestingUser);
  }
}
