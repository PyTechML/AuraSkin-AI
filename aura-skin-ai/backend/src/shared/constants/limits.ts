/**
 * Rate limits and abuse thresholds for chatbot and API.
 */

/** Max messages per user per minute (chatbot). */
export const CHATBOT_MESSAGES_PER_MINUTE = 10;

/** Max messages per user per hour (chatbot). */
export const CHATBOT_MESSAGES_PER_HOUR = 100;

/** Max messages per user per day (chatbot). */
export const CHATBOT_MESSAGES_PER_DAY = 50;

/** Number of warnings before blocking. */
export const CHATBOT_ABUSE_WARNINGS_BEFORE_BLOCK = 6;

/** Block duration in milliseconds (30 minutes). */
export const CHATBOT_BLOCK_DURATION_MS = 30 * 60 * 1000;
