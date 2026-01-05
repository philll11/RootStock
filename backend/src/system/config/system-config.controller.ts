import { Controller, Get, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from '../../iam/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';

@Controller('system/config')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SYSTEM_CONFIG_VIEW)
  async findAll() {
    return this.systemConfigService.getAll();
  }

  @Get(':key')
  @RequirePermission(PERMISSIONS.SYSTEM_CONFIG_VIEW)
  async findOne(@Param('key') key: string) {
    return this.systemConfigService.get(key);
  }

  @Patch(':key')
  @RequirePermission(PERMISSIONS.SYSTEM_CONFIG_EDIT)
  async update(@Param('key') key: string, @Body() updateSystemConfigDto: UpdateSystemConfigDto) {
    await this.systemConfigService.set(key, updateSystemConfigDto.value);
    return { success: true };
  }
}
