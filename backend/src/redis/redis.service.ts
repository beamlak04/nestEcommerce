import { Injectable } from '@nestjs/common';
import {  Redis } from 'ioredis'


@Injectable()
export class RedisService {
    private redisClient: Redis;

    onModuleInit() {
        this.redisClient = new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
            lazyConnect: false,
        });

        this.redisClient.on('connect', () => {
            console.log('Connected to Redis');
        });

        this.redisClient.on('ready', () => {
            console.log('Redis client is ready');
        });

        this.redisClient.on('error', (err) => {
            console.error('Redis connection error:', err);
        });

        this.redisClient.on('close', () => {
            console.log('Redis connection closed');
        });
    }

    async onModuleDestroy() {
        try {
            await this.redisClient.quit();
            console.log('Disconnected from Redis');
        } catch (err) {
            console.error('Error disconnecting from Redis:', err);
        }
    }

    getClient(): Redis {
        return this.redisClient;
    }

    async set(key: string, value: string, ttl?:number){
        if(ttl){
            return this.redisClient.set(key, value, 'EX', ttl);
        }
        return this.redisClient.set(key, value);
    }
    
    async get(key:string){
        return this.redisClient.get(key);
    }

    async del(key:string){
        return this.redisClient.del(key);
    }

    async exists(key:string){
        return this.redisClient.exists(key);
    }

    async expire(key:string, ttl:number){
        return this.redisClient.expire(key, ttl);
    }


    async hset(key: string, data: Record<string, string>){
        return this.redisClient.hset(key, data);
    }

    async hgetall(key: string){
        return this.redisClient.hgetall(key);
    }

    async hdel(key: string, field: string){
        return this.redisClient.hdel(key, field);
    }
}
