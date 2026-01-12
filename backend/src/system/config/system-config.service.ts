import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemConfig, SystemConfigDocument } from './schemas/system-config.schema';

@Injectable()
export class SystemConfigService implements OnModuleInit {
  private cache = new Map<string, { value: any; expiry: number }>();
  private readonly TTL = 60 * 1000; // 60 seconds

  constructor(
    @InjectModel(SystemConfig.name) private systemConfigModel: Model<SystemConfigDocument>,
  ) {}

  async onModuleInit() {
    // Optional: Preload critical configs here if needed
  }

  async get(key: string): Promise<SystemConfig | null> {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiry > now) {
      return cached.value as SystemConfig;
    }

    const config = await this.systemConfigModel.findOne({ key, isDeleted: false }).exec();
    if (config) {
      this.cache.set(key, { value: config, expiry: now + this.TTL });
      return config;
    }

    return null;
  }

  async set(key: string, value: any, description?: string): Promise<void> {
    const updatedConfig = await this.systemConfigModel.findOneAndUpdate(
      { key },
      { 
        key, 
        value, 
        ...(description && { description }),
        isDeleted: false 
      },
      { upsert: true, new: true }
    ).exec();

    // Invalidate cache or update it
    if (updatedConfig) {
      this.cache.set(key, { value: updatedConfig, expiry: Date.now() + this.TTL });
    }
  }

  async getAll(): Promise<SystemConfig[]> {
      return this.systemConfigModel.find({ isDeleted: false }).exec();
  }
}
