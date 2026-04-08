import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation.js';
import { AuthModule } from './auth/auth.module.js';
import appConfig from './config/app.config.js';
import { JwtGuard } from './auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from './auth/guards/roles/roles.guard.js';
import { APP_GUARD } from '@nestjs/core';
import { CsrfGuard } from './auth/guards/csrf/csrf.guard.js';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      load:[appConfig]
    }), PrismaModule, RedisModule, AuthModule],
  controllers: [AppController],
  providers: [AppService,
    {provide: APP_GUARD, useClass: JwtGuard},
    {provide: APP_GUARD, useClass: CsrfGuard},
    {provide: APP_GUARD, useClass: RolesGuard}
  ],
})
export class AppModule {}
