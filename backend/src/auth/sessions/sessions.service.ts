import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service.js';
import { hashToken } from '../utils/token.util.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../audit/audit.service.js';
import { AUDIT_ACTION } from '../../generated/prisma/enums.js';

@Injectable()
export class SessionsService {
    constructor(
        private redisService:RedisService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private auditService: AuditService
    ) {}

    async generateAccessToken(userId: string, role: string, sessionId: string){
        const payload = {
            sub: userId,
            role: role,
            sid: sessionId,
            type: 'access',
        }
        return this.jwtService.signAsync(payload,{
            secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
            expiresIn: Number(this.configService.getOrThrow<number>('jwt.accessTtl'))
        })
    }

    async generateRefreshToken(userId: string, sessionId: string){
        const payload = {
            sub: userId,
            sid: sessionId,
            type: 'refresh'
        }
        return this.jwtService.signAsync(payload, {
            secret: this.configService.get<string>('jwt.refreshSecret'),
            expiresIn: Number(this.configService.getOrThrow<number>('jwt.refreshTtl'))
        })
    }

    async verifyAccessToken(token: string){
        return this.jwtService.verifyAsync(token,{
            secret: this.configService.getOrThrow<string>('jwt.accessSecret')
        })
    }

    async verifyRefreshToken(token: string){
        return this.jwtService.verifyAsync(token,{
            secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        })
    }

    async getSession(sessionId: string){
        const sessionData = await this.redisService.get(`sess:${sessionId}`);
        if (!sessionData) return null;
        return JSON.parse(sessionData);
    }

    async delSession(sessionId: string){
        await this.redisService.del(`sess:${sessionId}`);
    }

    async createSession(userId: string, sessionId: string, refreshToken: string, ttl: number, metadata: {device: string, ip: string, userAgent: string}){
        const data = {
            userId,
            refreshTokenHash: hashToken(refreshToken),
            device: metadata.device,
            ip: metadata.ip,
            userAgent: metadata.userAgent,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            expiresAt: Date.now() + ttl * 1000
        }

        await this.redisService.set(
            `sess:${sessionId}`,
            JSON.stringify(data),
            ttl
        );        
        await this.redisService.sadd(`user_sess:${userId}`, sessionId);
    }

    async updateSessionActivity(sessionId: string){
        const key = `sess:${sessionId}`;
        const sessionData = await this.redisService.get(key);
        if (!sessionData) return;

        const session = JSON.parse(sessionData);
        session.lastActivity = Date.now();

        const ttl = await this.redisService.ttl(key);
        await this.redisService.set(key, JSON.stringify(session), ttl);
    }

    async validateSession(sessionId: string, refreshToken: string){
        const sessionData = await this.redisService.get(`sess:${sessionId}`);
        if (!sessionData) return false;

        const session = JSON.parse(sessionData);

        const hashedToken = hashToken(refreshToken);
        if(hashedToken !== session.refreshTokenHash) {
            await this.revokeUserSessions(session.userId);
            await this.auditService.logEvent({
                userId: session.userId,
                action: AUDIT_ACTION.TOKEN_REUSE_DETECTED,
                ip: session.ip,
                device: session.device,
                metadata: { userAgent: session.userAgent }
            });
            throw new UnauthorizedException('Refresh token validation failed.');
        }
        return session;
    }

    async rotateSession(sessionId: string, newToken: string, ttl: number){
        const sessionData = await this.redisService.get(`sess:${sessionId}`);
        if (!sessionData) return null;



        const session = JSON.parse(sessionData);
        session.refreshTokenHash = hashToken(newToken);
        session.lastActivity = Date.now();
        session.expiresAt = Date.now() + ttl * 1000;
        
        await this.redisService.set(`sess:${sessionId}`, JSON.stringify(session), ttl);

    }

    async revokeSession(sessionId: string){
        const sessionData = await this.redisService.get(`sess:${sessionId}`);
        if (!sessionData) return;

        const session = JSON.parse(sessionData);
        await this.redisService.srem(`user_sess:${session.userId}`, sessionId);
        await this.delSession(sessionId);
        await this.auditService.logEvent({
            userId: session.userId,
            action: AUDIT_ACTION.SESSION_REVOKED,
            ip: session.ip,
            device: session.device,
            metadata: { userAgent: session.userAgent }
        })

    }

    async revokeUserSessions(userId: string){
        const sessionIds = await this.redisService.smembers(`user_sess:${userId}`);
        for (const sessionId of sessionIds) {
            await this.redisService.del(`sess:${sessionId}`);
        }
        await this.redisService.del(`user_sess:${userId}`);
    }

    async listUserSessions(userId: string){
        const sessionIds = await this.redisService.smembers(`user_sess:${userId}`)
        const sessions = [{}];
        for (const key of sessionIds){
            const raw = await this.redisService.get(`sess:${key}`);

            if (raw){
                const data = JSON.parse(raw);
                if(data.userId === userId){
                    sessions.push({
                        sessionId: key.replace('sess:', ''),
                        createdAt: new Date(data.createdAt).toLocaleString(),
                        device: data.device,
                        ip: data.ip,
                        userAgent: data.userAgent,
                        lastActivity: new Date(data.lastActivity).toLocaleString(),
                        expiresAt: new Date(data.expiresAt).toLocaleString()
                    })
                }
            }
        }
        return sessions
    }

}
