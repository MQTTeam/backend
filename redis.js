// redisClient.js - Redis 연결 관리
const redis = require('redis');
const { CONFIG } = require('./config');

class RedisClient {
    constructor() {
        this.client = redis.createClient({
            socket: {
                host: CONFIG.REDIS.HOST,
                port: CONFIG.REDIS.PORT,
                reconnectStrategy: (retries) => {
                    if (retries > 5) {
                        console.error('Redis 재연결 시도 한계 초과');
                        return new Error('Redis 연결 재시도 한계 초과');
                    }
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('error', (err) => {
            console.error('Redis 클라이언트 오류:', err);
        });

        this.client.on('connect', () => {
            console.log('Redis연결 성공');
        });

        this.client.on('reconnecting', () => {
            console.log('Redis 재연결 중...');
        });
    }

    async connect() {
        await this.client.connect();
        console.log('Redis 연결이 설정되었습니다.');
    }

    async addActiveUser(nickname) {
        const isMember = await this.client.sIsMember(CONFIG.REDIS.NICKNAME_KEY, nickname);
        if (isMember) {
            throw new Error('이미 사용 중인 닉네임입니다.');
        }

        await this.client.sAdd(CONFIG.REDIS.NICKNAME_KEY, nickname);
        const activeCount = await this.client.sCard(CONFIG.REDIS.NICKNAME_KEY);

        console.log(`사용자 '${nickname}' 참여. 현재 활성 사용자: ${activeCount}명`);
        return { nickname, activeUsers: activeCount };
    }

    async removeActiveUser(nickname) {
        const removed = await this.client.sRem(CONFIG.REDIS.NICKNAME_KEY, nickname);
        const activeCount = await this.client.sCard(CONFIG.REDIS.NICKNAME_KEY);

        if (removed === 0) {
            console.log(`사용자 '${nickname}' 이미 목록에 없음`);
        } else {
            console.log(`사용자 '${nickname}' 퇴장. 현재 활성 사용자: ${activeCount}명`);
        }

        return { activeUsers: activeCount };
    }

    async getActiveUsers() {
        const activeUsers = await this.client.sMembers(CONFIG.REDIS.NICKNAME_KEY);
        return {
            users: activeUsers.sort(),
            count: activeUsers.length
        };
    }

    async healthCheck() {
        try {
            await this.client.ping();
            return true;
        } catch (error) {
            console.error('Redis 헬스체크 실패:', error.message);
            return false;
        }
    }

    async close() {
        if (this.client.isOpen) {
            await this.client.quit();
            console.log('Redis 연결이 종료되었습니다.');
        }
    }
}

module.exports = RedisClient;