import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { connect } from 'http2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.get<string>('database.url'),
    });
    super({adapter});
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('Connected to the database');
    } catch (error) {
      console.error('Failed to connect to the database:', error);
    }
  }
  
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      console.log('Disconnected from the database');
    } catch (error) {
      console.error('Failed to disconnect from the database:', error);
    }
  }

}
