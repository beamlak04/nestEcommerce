import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { OtpService } from './otp/otp.service.js';
import { SessionsService } from './sessions/sessions.service.js';
import { SmsService } from './sms/sms.service.js';
import { RateLimitService } from './rate-limit/rate-limit.service.js';
import { JwtModule } from '@nestjs/jwt';
import { SessionsController } from './sessions/sessions.controller.js';
import { CsrfService } from './csrf/csrf.service.js';

@Module({
  imports: [JwtModule.register({})],
  providers: [AuthService, OtpService, SessionsService, SmsService, RateLimitService, CsrfService],
  controllers: [AuthController, SessionsController],
  exports: [AuthService, SessionsService, CsrfService]
})
export class AuthModule {}
