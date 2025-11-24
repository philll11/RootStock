// backend/src/config/app.config.ts

import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  version: process.env.npm_package_version || '0.0.0',
  environment: process.env.NODE_ENV || 'development',
}));