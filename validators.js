// validators.js - 입력 검증 함수들
const { CONSTANTS } = require('./config');

function validateNickname(nickname) {
    if (!nickname || typeof nickname !== 'string') {
        return { valid: false, error: '닉네임은 문자열이어야 합니다.' };
    }

    const trimmed = nickname.trim();
    if (trimmed.length < CONSTANTS.MIN_NICKNAME_LENGTH) {
        return { valid: false, error: `닉네임은 최소 ${CONSTANTS.MIN_NICKNAME_LENGTH}자 이상이어야 합니다.` };
    }
    if (trimmed.length > CONSTANTS.MAX_NICKNAME_LENGTH) {
        return { valid: false, error: `닉네임은 ${CONSTANTS.MAX_NICKNAME_LENGTH}자를 초과할 수 없습니다.` };
    }

    if (!CONSTANTS.NICKNAME_REGEX.test(trimmed)) {
        return { valid: false, error: "닉네임에는 영문, 한글, 숫자, _, - 만 사용할 수 있습니다." };
    }

    return { valid: true, nickname: trimmed };
}

function validateMessage(content) {
    if (!content || typeof content !== 'string') {
        return { valid: false, error: '메시지 내용이 필요합니다.' };
    }

    const trimmed = content.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: '빈 메시지는 보낼 수 없습니다.' };
    }

    if (trimmed.length > CONSTANTS.MAX_MESSAGE_LENGTH) {
        return { valid: false, error: `메시지는 ${CONSTANTS.MAX_MESSAGE_LENGTH}자를 초과할 수 없습니다.` };
    }

    return { valid: true, content: trimmed };
}

function validateMentions(mentions) {
    if (!mentions) return { valid: true, mentions: [] };

    if (!Array.isArray(mentions)) {
        return { valid: false, error: 'mentions는 배열이어야 합니다.' };
    }

    for (const mention of mentions) {
        if (typeof mention !== 'string') {
            return { valid: false, error: '모든 mention은 문자열이어야 합니다.' };
        }
    }

    return { valid: true, mentions };
}

function validateReactionPayload(payload) {
    const { messageId, reactionType, nickname } = payload;

    if (!messageId || !reactionType || !nickname) {
        return { valid: false, error: '필수 필드가 누락된 리액션' };
    }

    if (typeof messageId !== 'number' && !Number.isInteger(parseInt(messageId))) {
        return { valid: false, error: '잘못된 messageId 형식' };
    }

    if (typeof reactionType !== 'string' || reactionType.trim().length === 0) {
        return { valid: false, error: '잘못된 reactionType 형식' };
    }

    const nicknameValidation = validateNickname(nickname);
    if (!nicknameValidation.valid) {
        return { valid: false, error: `닉네임 검증 실패: ${nicknameValidation.error}` };
    }

    return {
        valid: true,
        data: {
            messageId: parseInt(messageId),
            reactionType: reactionType.trim(),
            nickname: nicknameValidation.nickname
        }
    };
}

module.exports = {
    validateNickname,
    validateMessage,
    validateMentions,
    validateReactionPayload
};