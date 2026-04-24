import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    HttpStatus,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpService } from './otp/otp.service.js';
import { SessionsService } from './sessions/sessions.service.js';
import { SmsService } from './sms/sms.service.js';
import { RateLimitService } from './rate-limit/rate-limit.service.js';
import { OtpType } from '../generated/prisma/enums.js';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service.js';
import { AUDIT_ACTION } from '../generated/prisma/enums.js';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private otpService: OtpService,
        private sessionService: SessionsService,
        private smsService: SmsService,
        private rateLimitService: RateLimitService,
        private config: ConfigService,
        private auditService: AuditService
    ){}

    async register(name: string, phone: string, password: string, ip: string) {
        await this.rateLimitService.assertAllowed({
            action: 'register-otp',
            identifier: phone,
            ip,
            limit: 3,
            ttlSeconds: 300,
        });

        const existingUser = await this.prisma.user.findUnique({where: {phone}});
        if (existingUser) throw new ConflictException('Account already exists.');
        const otp = await this.otpService.createOtp(phone, OtpType.REGISTER);
        await this.smsService.sendSms(phone, `Your registration OTP is: ${otp}`);

        const hashedPassword = await bcrypt.hash(password, 12);

        await this.prisma.user.create({
            data:{phone, firstName: name, password: hashedPassword}
        })

        return { message: 'OTP sent to your phone. Please verify to complete registration.' };
    }

    async resendOtp(phone: string, ip: string){
        await this.rateLimitService.assertAllowed({
            action: 'resend-otp',
            identifier: phone,
            ip,
            limit: 3,
            ttlSeconds: 300,
        });

         const user = await this.prisma.user.findUnique({where: {phone}});
         if(!user) throw new NotFoundException('Account not found.');
         if(user.isVerified) throw new ConflictException('Account is already verified.');

        const otp = await this.otpService.createOtp(phone, OtpType.REGISTER)
        await this.smsService.sendSms(phone, `Your resgistration OTP is : ${otp}`)
    }

    async verify(phone: string, code: string, ip: string) {
        await this.rateLimitService.assertAllowed({
            action: 'verify-otp',
            identifier: phone,
            ip,
            limit: 5,
            ttlSeconds: 300,
        });

        const valid = await this.otpService.verifyOtp(phone, code, OtpType.REGISTER);
        if (!valid) throw new BadRequestException('Invalid or expired verification code.');

        await this.prisma.user.update({
            where: {phone},
            data: {isVerified: true}
        })

        return { message: 'Phone number verified successfully. You can now log in.' };
    }

    async login(phone: string, password: string, device: string, ip: string, userAgent: string) {
        await this.rateLimitService.assertAllowed({
            action: 'login',
            identifier: phone,
            ip,
            limit: 5,
            ttlSeconds: 300,
        });

        const user = await this.prisma.user.findUnique({where: {phone}});
        if (!user) {
            await this.auditService.logEvent({
                action: AUDIT_ACTION.LOGIN_FAILED,
                ip,
                device,
                metadata: { userAgent, reason: 'user_not_found', phone },
            });
            throw new UnauthorizedException('Invalid credentials.');
        }

        if (!user.isVerified) {
            await this.auditService.logEvent({
                action: AUDIT_ACTION.LOGIN_FAILED,
                userId: user.id,
                ip,
                device,
                metadata: { userAgent, reason: 'not_verified' },
            });
            throw new ForbiddenException('Account is not verified.');
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            await this.auditService.logEvent({
                action: AUDIT_ACTION.LOGIN_FAILED,
                userId: user.id,
                ip,
                device,
                metadata: { userAgent, reason: 'invalid_password' },
            });
            throw new UnauthorizedException('Invalid credentials.');
        }

        const sessionId = uuid();
        const refreshToken = await this.sessionService.generateRefreshToken(user.id, sessionId);
        const accessToken = await this.sessionService.generateAccessToken(user.id, user.role, sessionId);

        await this.sessionService.createSession(user.id, sessionId, refreshToken, this.config.getOrThrow<number>('jwt.refreshTtl'), {device, ip, userAgent});
       
        await this.auditService.logEvent({
            userId: user.id,
            action: AUDIT_ACTION.LOGIN_SUCCESS,
            ip,
            device,
            metadata: { userAgent },
        });
        return { accessToken, refreshToken };
    }

    async logout(refreshToken: string) {
        try {
            const payload = await this.sessionService.verifyRefreshToken(refreshToken);
            const session = await this.sessionService.getSession(payload.sid);
            await this.sessionService.delSession(payload.sid);
            await this.auditService.logEvent({
                userId: payload.sub,
                action: AUDIT_ACTION.LOGOUT,
                ip: session?.ip,
                device: session?.device,
                metadata: { sid: payload.sid, userAgent: session?.userAgent ?? 'unknown' },
            });
            return { message: 'Logged out successfully.' };
        } catch {
            throw new UnauthorizedException('Invalid refresh token.');
        }
    }

    async refreshToken(oldRefreshToken: string, device: string, ip: string, userAgent: string) {
        try {
            const payload = await this.sessionService.verifyRefreshToken(oldRefreshToken);
            const valid = await this.sessionService.validateSession(payload.sid, oldRefreshToken);
            if (!valid) throw new UnauthorizedException('Invalid session.');

            const newAccessToken = await this.sessionService.generateAccessToken(payload.sub, payload.role, payload.sid);
            const newRefreshToken = await this.sessionService.generateRefreshToken(payload.sub, payload.sid);

            await this.sessionService.rotateSession(payload.sid, newRefreshToken, this.config.getOrThrow<number>('jwt.refreshTtl'));

            await this.auditService.logEvent({
                userId: payload.sub,
                action: AUDIT_ACTION.TOKEN_REFRESH,
                ip,
                device,
                metadata: { userAgent },
            });
            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        } catch {
            throw new UnauthorizedException('Invalid refresh token.');
        }
    }

    async requestPasswordReset(phone: string, ip: string) {
        await this.rateLimitService.assertAllowed({
            action: 'password-reset-request',
            identifier: phone,
            ip,
            limit: 3,
            ttlSeconds: 300,
        });

        const otp = await this.otpService.sendResetOtp(phone);
        await this.smsService.sendSms(phone, `Your password reset OTP is: ${otp}`);
        await this.auditService.logEvent({
            action: AUDIT_ACTION.PASSWORD_RESET_REQUEST,
            metadata: { phone },
        });
        return { message: 'Password reset OTP sent to your phone.' };
    }

    async resetPassword(phone: string, code: string, newPassword: string) {
        try {
            const valid = await this.otpService.verifyOtp(phone, code, OtpType.RESET_PASSWORD);
            if (!valid) {
                throw new BadRequestException('Invalid or expired reset code.');
            }

            const hashedPassword = await bcrypt.hash(newPassword, 12);
            const user = await this.prisma.user.update({
                where: { phone },
                data: { password: hashedPassword },
            });

            await this.sessionService.revokeUserSessions(user.id);
            await this.auditService.logEvent({
                userId: user.id,
                action: AUDIT_ACTION.PASSWORD_RESET_SUCCESS,
                metadata: { phone },
            });

            return { message: 'Password reset successfully. You can now log in with your new password.' };
        } catch (error) {
            await this.auditService.logEvent({
                action: AUDIT_ACTION.PASSWORD_RESET_FAILED,
                metadata: { phone, reason: 'invalid_otp_or_update_failed' },
            });

            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new UnauthorizedException('Unable to reset password.');
        }
    }

}
