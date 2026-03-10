export default () => ({
    app:{
        port: parseInt(process.env.PORT || '3000', 10),
        env: process.env.NODE_ENV || 'development',
    },

    database:{
        url: process.env.DATABASE_URL,
    },
    redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    jwt:{
        accessSecret: process.env.JWT_ACCESS_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessTtl: process.env.JWT_ACCESS_TTL,
        refreshTtl: process.env.JWT_REFRESH_TTL,
    }
})