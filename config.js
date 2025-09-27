// config.js - 애플리케이션 설정 관리
const CONSTANTS = {
    MAX_MESSAGE_LENGTH: 1000,
    MAX_NICKNAME_LENGTH: 10,
    MIN_NICKNAME_LENGTH: 2,
    DEFAULT_MESSAGE_LIMIT: 50,
    MAX_MESSAGE_LIMIT: 100,
    NICKNAME_REGEX: /^[a-zA-Z0-9가-힣_-]+$/,
    MQTT_QOS: 1,
    DB_QUERY_TIMEOUT: 5000
};

const CONFIG = {
    // Server
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Database
    DB: {
        USER: process.env.DB_USER || 'postgres',
        HOST: process.env.DB_HOST || 'localhost',
        NAME: process.env.DB_NAME || 'chatdb',
        PASSWORD: process.env.DB_PASSWORD || 'password',
        PORT: process.env.DB_PORT || 5432
    },
    
    // Redis
    REDIS: {
        HOST: process.env.REDIS_HOST || 'localhost',
        PORT: process.env.REDIS_PORT || 6379,
        NICKNAME_KEY: process.env.REDIS_NICKNAME_KEY || 'active_nicknames'
    },
    
    // MQTT
    MQTT: {
        BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
        TOPIC_PUBLIC: process.env.MQTT_TOPIC_PUBLIC || 'k8s-chat/public',
        TOPIC_REACTION: process.env.MQTT_TOPIC_REACTION || 'k8s-chat/reaction'
    },
    
    // CORS
    CORS: {
        ORIGIN: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*'
    }
};

module.exports = {
    CONSTANTS,
    CONFIG
};