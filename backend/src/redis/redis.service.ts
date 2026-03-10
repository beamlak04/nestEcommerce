import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {  Redis } from 'ioredis'


@Injectable()
export class RedisService {
    constructor(private config: ConfigService){}
    private redisClient: Redis;
    
    onModuleInit() {
        this.redisClient = new Redis({
            host: this.config.get<string>('redis.host'),
            port: this.config.get<number>('redis.port'),
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
            lazyConnect: false,
        });

        this.redisClient.on('connect', () => {
            console.log('Connected to Redis',
                this.config.get<string>('redis.host'),
                this.config.get<number>('redis.port'),
            );
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


    async keys(pattern:string){
        return this.redisClient.keys(pattern);
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

    async incr(key:string){
        return this.redisClient.incr(key);
    }

    async decr(key:string){
        return this.redisClient.decr(key);
    }

    async ttl(key:string){
        return this.redisClient.ttl(key);
    }

    async sadd(key:string, member:string){
        return this.redisClient.sadd(key, member);
    }

    async smembers(key:string){
        return this.redisClient.smembers(key);
    }

    async srem(key:string, member:string){
        return this.redisClient.srem(key, member);
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
