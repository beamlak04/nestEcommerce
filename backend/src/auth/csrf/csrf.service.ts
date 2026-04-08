import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CsrfService {
    private readonly csrfSecret: string;

    constructor(private readonly configService: ConfigService) {
        this.csrfSecret =
            this.configService.get<string>('csrf.secret') ||
            this.configService.getOrThrow<string>('jwt.refreshSecret');
    }

    generateToken(refreshToken: string): string {
        const nonce = randomBytes(32).toString('base64url');
        const signature = this.sign(refreshToken, nonce);
        return `${nonce}.${signature}`;
    }

    validate(cookieToken: string, headerToken: string, refreshToken: string): boolean {
        if (!cookieToken || !headerToken || !refreshToken) {
            return false;
        }

        if (cookieToken !== headerToken) {
            return false;
        }

        const [nonce, providedSignature] = cookieToken.split('.');
        if (!nonce || !providedSignature) {
            return false;
        }

        const expectedSignature = this.sign(refreshToken, nonce);
        const expectedBuffer = Buffer.from(expectedSignature);
        const providedBuffer = Buffer.from(providedSignature);

        if (expectedBuffer.length !== providedBuffer.length) {
            return false;
        }

        return timingSafeEqual(expectedBuffer, providedBuffer);
    }

    private sign(refreshToken: string, nonce: string): string {
        return createHmac('sha256', this.csrfSecret)
            .update(`${refreshToken}.${nonce}`)
            .digest('base64url');
    }
}
