import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.get<string>('database.url'),
    });
    super({adapter});
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connection established.');
    } catch (error: unknown) {
      this.logger.error('Failed to connect to the database.', error instanceof Error ? error.stack : undefined);
    }
  }
  
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database connection closed.');
    } catch (error: unknown) {
      this.logger.error('Failed to disconnect from the database.', error instanceof Error ? error.stack : undefined);
    }
  }

}
