// app.js - 메인 애플리케이션 파일
const express = require('express');
const cors = require('cors');

// 모듈 임포트
const { CONFIG } = require('./config.js');
const Database = require('./database.js');
const RedisClient = require('./redis.js');
const MQTTClient = require('./mqtt.js');
const { handleChatMessage, handleReaction } = require('./msghandler.js');
const createRoutes = require('./routes.js');

class ChatApplication {
    constructor() {
        this.app = express();
        this.database = null;
        this.redisClient = null;
        this.mqttClient = null;
        this.server = null;
    }

    setupMiddleware() {
        // CORS 설정
        this.app.use(cors({
            origin: CONFIG.CORS.ORIGIN,
            credentials: true
        }));

        // Body parser 설정
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // 로깅 미들웨어
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // API 라우트 설정
        const apiRoutes = createRoutes(this.database, this.redisClient, this.mqttClient);
        this.app.use('/api', apiRoutes);

        // 404 핸들러
        this.app.use((req, res) => {
            res.status(404).json({
                status: 'error',
                message: '요청한 엔드포인트를 찾을 수 없습니다.',
                path: req.originalUrl
            });
        });

        // 전역 에러 핸들러
        this.app.use((error, req, res, next) => {
            console.error('전역 에러 핸들러:', error);
            res.status(500).json({
                status: 'error',
                message: '서버 내부 오류가 발생했습니다.',
                timestamp: new Date().toISOString()
            });
        });
    }

    async initializeServices() {
        try {
            // 데이터베이스 초기화
            this.database = new Database();
            await this.database.createTables();

            // Redis 클라이언트 초기화
            this.redisClient = new RedisClient();
            await this.redisClient.connect();

            // MQTT 클라이언트 초기화 (메시지 핸들러와 함께)
            this.mqttClient = new MQTTClient(
                (payload) => handleChatMessage(this.database, payload),
                (payload) => handleReaction(this.database, payload)
            );

            console.log('모든 서비스가 성공적으로 초기화되었습니다.');
        } catch (error) {
            console.error('서비스 초기화 중 오류 발생:', error);
            throw error;
        }
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`${signal} 신호를 수신했습니다. 안전하게 종료합니다.`);

            const shutdownPromises = [];

            try {
                // HTTP 서버 종료
                if (this.server) {
                    shutdownPromises.push(
                        new Promise((resolve) => {
                            this.server.close(() => {
                                console.log('HTTP 서버가 종료되었습니다.');
                                resolve();
                            });
                        })
                    );
                }

                // MQTT 클라이언트 종료
                if (this.mqttClient) {
                    shutdownPromises.push(this.mqttClient.close());
                }

                // Redis 클라이언트 종료
                if (this.redisClient) {
                    shutdownPromises.push(this.redisClient.close());
                }

                // 데이터베이스 연결 종료
                if (this.database) {
                    shutdownPromises.push(this.database.close());
                }

                // 10초 타임아웃과 함께 모든 종료 작업 대기
                await Promise.race([
                    Promise.all(shutdownPromises),
                    new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('종료 시간 초과')), 10000);
                    })
                ]);

                console.log('모든 연결이 안전하게 종료되었습니다.');
                process.exit(0);
            } catch (error) {
                console.error('안전한 종료 중 오류 발생:', error);
                process.exit(1);
            }
        };

        // 종료 신호 핸들러 등록
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        // 예외 처리
        process.on('unhandledRejection', (error, promise) => {
            console.error('처리되지 않은 Promise rejection:', error);
        });

        process.on('uncaughtException', (error) => {
            console.error('처리되지 않은 예외:', error);
            shutdown('UNCAUGHT_EXCEPTION');
        });
    }

    async start() {
        try {
            // 미들웨어 설정
            this.setupMiddleware();

            // 서비스 초기화
            await this.initializeServices();

            // 라우트 설정
            this.setupRoutes();

            // 안전한 종료 설정
            this.setupGracefulShutdown();

            // 서버 시작
            this.server = this.app.listen(CONFIG.PORT, () => {
                console.log(`메시지 아카이버 서버가 ${CONFIG.PORT}번 포트에서 실행 중입니다.`);
                console.log(`헬스 체크: http://localhost:${CONFIG.PORT}/api/health`);
                console.log(`환경: ${CONFIG.NODE_ENV}`);
            });

            this.server.on('close', () => {
                console.log('HTTP 서버가 종료되었습니다.');
            });

        } catch (error) {
            console.error('서버 시작에 실패했습니다:', error);
            await this.shutdown('STARTUP_ERROR');
        }
    }

    async shutdown(reason) {
        console.log(`서버 종료 이유: ${reason}`);

        if (this.mqttClient) await this.mqttClient.close();
        if (this.redisClient) await this.redisClient.close();
        if (this.database) await this.database.close();

        process.exit(1);
    }
}

// 애플리케이션 실행
if (require.main === module) {
    const app = new ChatApplication();
    app.start();
}

module.exports = ChatApplication;