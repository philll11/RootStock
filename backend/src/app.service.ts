// backend/src/app.service.ts

import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import appConfig from './config/app.config';

@Injectable()
export class AppService {
  constructor(
    // Inject the app-specific config using its registration key
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Provides the simple liveness status.
   */
  getLivenessStatus(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * Performs a deep readiness check of the application and its dependencies.
   */
  async getReadinessStatus() {
    // Use the injected config values instead of hardcoded constants
    const appVersion = this.config.version;
    const nodeEnv = this.config.environment;

    try {
      if (!this.connection.db?.admin) {
        throw new InternalServerErrorException('Database connection is not properly initialized.');
      }
      await this.connection.db.admin().ping();

      return {
        status: 'pass',
        version: appVersion,
        environment: nodeEnv,
        details: {
          database: {
            status: 'pass',
            componentType: 'datastore',
            time: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      const errorDetails = {
        status: 'fail',
        version: appVersion,
        environment: nodeEnv,
        details: {
          database: {
            status: 'fail',
            componentType: 'datastore',
            output: error.message,
            time: new Date().toISOString(),
          },
        },
      };
      throw new InternalServerErrorException(errorDetails);
    }
  }
}