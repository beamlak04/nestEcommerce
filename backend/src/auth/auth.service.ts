import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpService } from './otp/otp.service.js';
import { SessionsService } from './sessions/sessions.service.js';
import { SmsService } from './sms/sms.service.js';
import { RateLimitService } from './rate-limit/rate-limit.service.js';
import { OtpType } from '../generated/prisma/enums.js';
import bcrypt from 'bcrypt';
import { hashToken } from './utils/token.util.js';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private otpService: OtpService,
        private sessionService: SessionsService,
        private smsService: SmsService,
        private rateLimitService: RateLimitService,
        private config: ConfigService
    ){}

    async register(name: string, phone: string, password: string) {
        const allowed = await this.rateLimitService.isAllowed(`otp:${phone}`, 3, 300);
        if (!allowed) throw new UnauthorizedException('Too many OTP requests. Please try again later.');

        const existingUser = await this.prisma.user.findUnique({where: {phone}});
        if (existingUser) throw new UnauthorizedException('Phone number already registered.');
        const otp = await this.otpService.createOtp(phone, OtpType.REGISTER);
        await this.smsService.sendSms(phone, `Your registration OTP is: ${otp}`);

        const hashedPassword = await bcrypt.hash(password, 12);

        await this.prisma.user.create({
            data:{phone, name, password: hashedPassword}
        })

        return { message: 'OTP sent to your phone. Please verify to complete registration.' };
    }

    async resendOtp(phone: string){
        const allowed = await this.rateLimitService.isAllowed(`otp:${phone}`, 3, 300);
        if (!allowed) throw new UnauthorizedException('Too many OTP requests. Please try again later.');

         const user = await this.prisma.user.findUnique({where: {phone}});
         if(!user) throw new UnauthorizedException('User not found.');
         if(user.isVerified) throw new UnauthorizedException('Phone number already verified.');

        const otp = await this.otpService.createOtp(phone, OtpType.REGISTER)
        await this.smsService.sendSms(phone, `Your resgistration OTP is : ${otp}`)
    }

    async verify(phone: string, code: string) {
        const valid = await this.otpService.verifyOtp(phone, code, OtpType.REGISTER);
        if (!valid) throw new UnauthorizedException('Invalid or expired OTP.');

        await this.prisma.user.update({
            where: {phone},
            data: {isVerified: true}
        })

        return { message: 'Phone number verified successfully. You can now log in.' };
    }

    async login(phone: string, password: string, device: string, ip: string, userAgent: string) {
        const allowed = await this.rateLimitService.isAllowed(`login:${phone}`, 5, 300);
        if (!allowed) throw new UnauthorizedException('Too many login attempts. Please try again later.');

        const user = await this.prisma.user.findUnique({where: {phone}});
        if (!user) throw new UnauthorizedException('User not found.');
        if (!user.isVerified) throw new UnauthorizedException('Phone number not verified.');

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) throw new UnauthorizedException('Invalid credentials.');

        const sessionId = uuid();
        const refreshToken = await this.sessionService.generateRefreshToken(user.id, sessionId);
        const accessToken = await this.sessionService.generateAccessToken(user.id, user.role, sessionId);

        await this.sessionService.createSession(user.id, sessionId, refreshToken, this.config.getOrThrow<number>('jwt.refreshTtl'), {device: device, ip: ip, userAgent: userAgent}); // 7 days
       
        //console.log(`login: userId=${user.id}, sessionId=${sessionId}, device=${device}, ip=${ip}, userAgent=${userAgent}`);
        return { accessToken, refreshToken };
    }

    async logout(refreshToken: string) {
        try {
            const payload = await this.sessionService.verifyRefreshToken(refreshToken);
            await this.sessionService.delSession(payload.sid);
            return { message: 'Logged out successfully.' };
        } catch (error) {
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

            await this.sessionService.rotateSession(payload.sid, newRefreshToken, this.config.getOrThrow<number>('jwt.refreshTtl')); // 7 days


            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        } catch (error) {
            console.log('Refresh token error:', error);
            throw new UnauthorizedException('Failed to refresh token.');
        }
    }

    async requestPasswordReset(phone: string) {
        const allowed = await this.rateLimitService.isAllowed(`pwd-reset:${phone}`, 3, 300);
        if (!allowed) throw new UnauthorizedException('Too many password reset requests. Please try again later.');

        await this.otpService.sendResetOtp(phone);
        return { message: 'Password reset OTP sent to your phone.' };
    }

    async resetPassword(phone: string, code: string, newPassword: string) {
        try {
            const valid = await this.otpService.verifyOtp(phone, code, OtpType.RESET_PASSWORD);
        if (!valid) throw new UnauthorizedException('Invalid or expired OTP.');

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const user = await this.prisma.user.update({
            where: {phone},
            data: {password: hashedPassword}
        })

        await this.sessionService.revokeUserSessions(user.id);
        
        return { message: 'Password reset successfully. You can now log in with your new password.' };
        } catch (error) {
            console.log('Password reset error:', error);
            throw new UnauthorizedException('Failed to reset password.');
        }
    }

}
