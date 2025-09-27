// messageHandlers.js - MQTT 메시지 처리 핸들러
const { validateNickname, validateMessage, validateMentions, validateReactionPayload } = require('./validators');

/**
 * 채팅 메시지를 받아 데이터베이스에 저장하는 함수
 * @param {object} database - 데이터베이스 인스턴스
 * @param {object} payload - 메시지 내용, 닉네임, 멘션 등이 담긴 객체
 */
async function handleChatMessage(database, payload) {
    const { nickname, content, mentions = [] } = payload;

    const nicknameValidation = validateNickname(nickname);
    if (!nicknameValidation.valid) {
        console.error('닉네임 검증 실패:', nicknameValidation.error, payload);
        return;
    }

    const contentValidation = validateMessage(content);
    if (!contentValidation.valid) {
        console.error('메시지 검증 실패:', contentValidation.error, payload);
        return;
    }

    const mentionsValidation = validateMentions(mentions);
    if (!mentionsValidation.valid) {
        console.error('멘션 검증 실패:', mentionsValidation.error, payload);
        return;
    }

    try {
        const result = await database.saveMessage(
            nicknameValidation.nickname,
            contentValidation.content,
            mentionsValidation.mentions
        );

        console.log(`메시지 저장 완료 (ID: ${result.rows[0].id}, 시간: ${result.rows[0].created_at})`);
    } catch (error) {
        console.error('메시지 저장 중 오류 발생:', error);
    }
}

/**
 * 리액션 이벤트를 받아 데이터베이스를 업데이트하는 함수
 * @param {object} database - 데이터베이스 인스턴스
 * @param {object} payload - 메시지ID, 리액션 종류, 닉네임이 담긴 객체
 */
async function handleReaction(database, payload) {
    const validation = validateReactionPayload(payload);
    if (!validation.valid) {
        console.error('리액션 검증 실패:', validation.error, payload);
        return;
    }

    const { messageId, reactionType, nickname } = validation.data;

    try {
        const result = await database.updateReaction(messageId, reactionType, nickname);

        console.log(`메시지(ID: ${messageId})의 리액션(${reactionType})이 업데이트되었습니다. (작업자: ${nickname})`);
    } catch (error) {
        if (error.message.includes('찾을 수 없습니다')) {
            console.error(`ID가 ${messageId}인 메시지를 찾을 수 없습니다.`);
        } else {
            console.error('리액션 처리 중 오류 발생:', error);
        }
    }
}

module.exports = {
    handleChatMessage,
    handleReaction
};