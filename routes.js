// routes.js - Express 라우트 정의
const express = require('express');
const { validateNickname } = require('./validators');
const { CONSTANTS } = require('./config');

function createRoutes(database, redisClient, mqttClient) {
    const router = express.Router();

    /**
     * POST /api/join
     * 사용자가 채팅 참여를 요청할 때 닉네임 중복을 검사하고, 활성 사용자 목록에 추가합니다.
     */
    router.post('/join', async (req, res) => {
        const { nickname } = req.body;

        const validation = validateNickname(nickname);
        if (!validation.valid) {
            return res.status(400).json({
                status: 'error',
                message: validation.error
            });
        }

        try {
            const result = await redisClient.addActiveUser(validation.nickname);
            
            res.status(200).json({
                status: 'success',
                message: '닉네임 사용 가능합니다.',
                data: result
            });
        } catch (error) {
            if (error.message.includes('이미 사용 중인')) {
                return res.status(409).json({
                    status: 'error',
                    message: error.message
                });
            }
            
            console.error('닉네임 확인 중 오류 발생:', error);
            res.status(500).json({
                status: 'error',
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    });

    /**
     * POST /api/leave
     * 사용자가 채팅방을 떠날 때 활성 사용자 목록에서 제거합니다.
     */
    router.post('/leave', async (req, res) => {
        const { nickname } = req.body;

        const validation = validateNickname(nickname);
        if (!validation.valid) {
            return res.status(400).json({
                status: 'error',
                message: validation.error
            });
        }

        try {
            const result = await redisClient.removeActiveUser(validation.nickname);
            
            res.status(200).json({
                status: 'success',
                message: '활성 사용자 목록에서 제거되었습니다.',
                data: result
            });
        } catch (error) {
            console.error('사용자 제거 중 오류 발생:', error);
            res.status(500).json({
                status: 'error',
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    });

    /**
     * GET /api/messages
     * 최근 채팅 메시지를 조회합니다.
     */
    router.get('/messages', async (req, res) => {
        const limit = Math.min(
            parseInt(req.query.limit) || CONSTANTS.DEFAULT_MESSAGE_LIMIT,
            CONSTANTS.MAX_MESSAGE_LIMIT
        );

        try {
            const messages = await database.getMessages(limit);
            
            res.status(200).json({
                status: 'success',
                data: messages,
                meta: { count: messages.length, limit }
            });
        } catch (error) {
            console.error('메시지 조회 중 오류 발생:', error);
            res.status(500).json({
                status: 'error',
                message: '메시지 기록을 가져오는데 실패했습니다.'
            });
        }
    });

    /**
     * GET /api/active-users
     * 현재 활성 사용자 목록을 조회합니다.
     */
    router.get('/active-users', async (req, res) => {
        try {
            const result = await redisClient.getActiveUsers();
            
            res.status(200).json({
                status: 'success',
                data: result.users,
                meta: { count: result.count }
            });
        } catch (error) {
            console.error('활성 사용자 조회 중 오류 발생:', error);
            res.status(500).json({
                status: 'error',
                message: '활성 사용자 목록을 가져오는데 실패했습니다.'
            });
        }
    });

    /**
     * GET /health
     * 서비스 헬스체크 엔드포인트
     */
    router.get('/health', async (req, res) => {
        const checks = {
            database: await database.healthCheck(),
            redis: await redisClient.healthCheck(),
            mqtt: mqttClient.isConnected()
        };

        const isHealthy = Object.values(checks).every(Boolean);

        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? 'healthy' : 'degraded',
            checks,
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    });

    return router;
}

module.exports = createRoutes;