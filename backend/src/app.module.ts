import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { ConfigModule } from '@nestjs/config';
import { TestModule } from './test/test.module.js';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }), PrismaModule, RedisModule, TestModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
