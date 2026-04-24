import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from '../../redis/redis.service.js';

type RateLimitOptions = {
    action: string;
    limit: number;
    ttlSeconds: number;
    identifier?: string;
    ip?: string;
};

@Injectable()
export class RateLimitService {
    constructor(private redisService: RedisService) {}

    async assertAllowed(options: RateLimitOptions): Promise<void> {
        const keys = this.buildKeys(options.action, options.identifier, options.ip);
        let maxRetryAfter = 0;

        for (const key of keys) {
            const { count, retryAfter } = await this.incrementWithWindow(key, options.ttlSeconds);
            maxRetryAfter = Math.max(maxRetryAfter, retryAfter);

            if (count > options.limit) {
                throw new HttpException(
                    {
                        statusCode: HttpStatus.TOO_MANY_REQUESTS,
                        message: 'Too many requests. Please try again later.',
                        retryAfter,
                    },
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }
        }

        if (maxRetryAfter < 0) {
            throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    private buildKeys(action: string, identifier?: string, ip?: string): string[] {
        const keys: string[] = [];
        const actionKey = this.sanitize(action);
        const hashedIdentifier = identifier ? this.hashIdentifier(identifier) : null;

        if (hashedIdentifier) {
            keys.push(`rl:${actionKey}:id:${hashedIdentifier}`);
        }

        if (ip) {
            keys.push(`rl:${actionKey}:ip:${ip}`);
        }

        if (hashedIdentifier && ip) {
            keys.push(`rl:${actionKey}:idip:${hashedIdentifier}:${ip}`);
        }

        if (keys.length === 0) {
            keys.push(`rl:${actionKey}:global`);
        }

        return keys;
    }

    private hashIdentifier(value: string): string {
        return createHash('sha256')
            .update(value.trim().toLowerCase())
            .digest('hex')
            .slice(0, 24);
    }

    private sanitize(value: string): string {
        return value.trim().toLowerCase().replace(/[^a-z0-9:-]/g, '_');
    }

    private async incrementWithWindow(key: string, ttlSeconds: number): Promise<{ count: number; retryAfter: number }> {
        const script = `
local window = tonumber(ARGV[1])
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], window)
end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], window)
  ttl = window
end
return {current, ttl}
`;

        const result = (await this.redisService
            .getClient()
            .eval(script, 1, key, String(ttlSeconds))) as [number | string, number | string];

        const count = Number(result[0]);
        const retryAfter = Number(result[1]);

        return { count, retryAfter };
    }
}
