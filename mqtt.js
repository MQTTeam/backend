// mqttClient.js - MQTT 클라이언트 관리
const mqtt = require('mqtt');
const { CONFIG, CONSTANTS } = require('./config');

class MQTTClient {
    constructor(messageHandler, reactionHandler) {
        this.messageHandler = messageHandler;
        this.reactionHandler = reactionHandler;

        this.client = mqtt.connect(CONFIG.MQTT.BROKER_URL, {
            clientId: `archiver_${Math.random().toString(16).substr(2, 8)}`,
            clean: true,
            reconnectPeriod: 1000,
            keepalive: 60,
            connectTimeout: 30000
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('connect', () => {
            console.log('MQTT 브로커에 연결되었습니다.');
            this.subscribeToTopics();
        });

        this.client.on('message', async (topic, message) => {
            try {
                const messageStr = message.toString();
                if (!messageStr.trim()) {
                    console.warn('빈 메시지 수신', topic);
                    return;
                }

                const payload = JSON.parse(messageStr);

                if (topic === CONFIG.MQTT.TOPIC_PUBLIC) {
                    await this.messageHandler(payload);
                } else if (topic === CONFIG.MQTT.TOPIC_REACTION) {
                    await this.reactionHandler(payload);
                }
            } catch (error) {
                if (error instanceof SyntaxError) {
                    console.error(`JSON 파싱 오류 - Topic: ${topic}, Message: ${messageStr.substring(0, 100)}...`);
                } else {
                    console.error(`${topic} 토픽 메시지 처리 중 오류 발생`, error);
                }
            }
        });

        this.client.on('reconnect', () => {
            console.log('MQTT 브로커 재연결 중...');
        });

        this.client.on('offline', () => {
            console.log('MQTT 브로커 연결 끊어짐');
        });

        this.client.on('error', (error) => {
            console.error('MQTT 연결 오류', error);
        });

        this.client.on('close', () => {
            console.log('MQTT 연결이 종료되었습니다.');
        });
    }

    subscribeToTopics() {
        // 채팅 메시지 토픽 구독
        this.client.subscribe(CONFIG.MQTT.TOPIC_PUBLIC, { qos: CONSTANTS.MQTT_QOS }, (err) => {
            if (err) {
                console.error(`${CONFIG.MQTT.TOPIC_PUBLIC} 채팅 토픽 구독 실패:`, err);
            } else {
                console.log(`${CONFIG.MQTT.TOPIC_PUBLIC} 채팅 토픽을 성공적으로 구독했습니다.`);
            }
        });

        // 리액션 토픽 구독
        this.client.subscribe(CONFIG.MQTT.TOPIC_REACTION, { qos: CONSTANTS.MQTT_QOS }, (err) => {
            if (err) {
                console.error(`${CONFIG.MQTT.TOPIC_REACTION} 리액션 토픽 구독 실패:`, err);
            } else {
                console.log(`${CONFIG.MQTT.TOPIC_REACTION} 리액션 토픽을 성공적으로 구독했습니다.`);
            }
        });
    }

    isConnected() {
        return this.client.connected;
    }

    async close() {
        return new Promise((resolve) => {
            if (this.client.connected) {
                this.client.end(false, {}, () => {
                    console.log('MQTT 연결이 종료되었습니다.');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = MQTTClient;