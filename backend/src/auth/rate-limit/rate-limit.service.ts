import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service.js';

@Injectable()
export class RateLimitService {
    constructor(private redisService: RedisService) {}

    async isAllowed(key: string, limit: number, ttl: number): Promise<boolean> {
        const current = await this.redisService.incr(key);

        if (current === 1) {
            await this.redisService.expire(key, ttl);
        }
        
        return current <= limit;
    }

    async limitPasswordReset(phone: string){
        const key = `reset:${phone}`;
        const count = await this.redisService.incr(key);

        if(count === 1){
            await this.redisService.expire(key, 300); // 5 minutes
        }
        if (count > 3) {
            throw new Error('Too many password reset attempts. Please try again later.');
        }
    }
}
