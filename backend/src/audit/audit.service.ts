import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AUDIT_ACTION } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private prisma: PrismaService){}

    async logEvent(params: {
        action: AUDIT_ACTION,
        userId?: string,
        ip?: string,
        device?: string,
        metadata?: Prisma.InputJsonValue,
    }){
        const metadata = params.metadata ?? { source: 'system' };

        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: params.userId,
                    action: params.action,
                    ipAddress: params.ip ?? 'unknown',
                    device: params.device ?? 'unknown',
                    metadata,
                },
            });
        } catch (error: unknown) {
            this.logger.warn('Failed to write audit log entry.');
            this.logger.debug(error instanceof Error ? error.message : 'Unknown audit logging error');
        }
    }
}
