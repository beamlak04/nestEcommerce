import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class TestService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService
    ) {}

    async run(){
        const db = await this.prisma.test.findMany();

        const redis = await this.redis.get('test');
        
        return {
            db,redis   
        }
    }
    
}
