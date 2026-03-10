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

        await this.prisma.otp.create({
            data: {
                phone,
                code: otp,
                type,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000) // OTP expires in 5 minutes
            }
        })

        return otp;
    }

    async sendResetOtp(phone: string){
        const otp = await this.createOtp(phone, OtpType.RESET_PASSWORD)
        console.log(`RESET OTP for ${phone}: ${otp}`);
    }

    async verifyOtp(phone: string, code: string, type: OtpType) {
        const otpRecord = await this.prisma.otp.findFirst({
            where: {phone, code, type},
            orderBy: {createdAt: 'desc'}
        })

        if (!otpRecord) return false;
        if (otpRecord.expiresAt < new Date()) return false;

        return true;
    }
}
