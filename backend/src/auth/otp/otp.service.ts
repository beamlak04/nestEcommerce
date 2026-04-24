import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { randomInt } from 'crypto';
import { OtpType } from '../../generated/prisma/enums.js';

@Injectable()
export class OtpService {
    constructor(private readonly prisma: PrismaService) {}

    generateOtp():string{
        return randomInt(100000, 999999).toString();
    }

    async createOtp(phone: string, type: OtpType) {
        const otp = this.generateOtp();

        // Keep only one active OTP per phone/type by invalidating any previous unused codes.
        await this.prisma.otp.updateMany({
            where: {
                phone,
                type,
                used: false,
            },
            data: {
                used: true,
            },
        });

        await this.prisma.otp.create({
            data: {
                phone,
                code: otp,
                type,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            }
        })

        return otp;
    }

    async sendResetOtp(phone: string){
        return this.createOtp(phone, OtpType.RESET_PASSWORD);
    }

    async verifyOtp(phone: string, code: string, type: OtpType) {
        const otpRecord = await this.prisma.otp.findFirst({
            where: {phone, code, type, used: false},
            orderBy: {createdAt: 'desc'}
        })

        if (!otpRecord) return false;
        if (otpRecord.expiresAt < new Date()) return false;

        await this.prisma.otp.update({
            where: { id: otpRecord.id },
            data: { used: true },
        });

        return true;
    }
}
