// backend/src/app.controller.ts

import { Controller, Get, InternalServerErrorException, ServiceUnavailableException, } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './iam/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Liveness Probe: Defines the /status route and calls the service.
   */
  @Public()
  @Get('status')
  getLivenessStatus() {
    return this.appService.getLivenessStatus();
  }

  /**
   * Readiness Probe: Defines the /status/ready route and calls the service.
   */
  @Public()
  @Get('status/ready')
  async getReadinessStatus() {
    try {
      // The call is now clean, just awaiting the service's response
      return await this.appService.getReadinessStatus();
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw new ServiceUnavailableException(error.getResponse());
      }
      throw new ServiceUnavailableException('An unexpected error occurred during the health check.');
    }
  }
}