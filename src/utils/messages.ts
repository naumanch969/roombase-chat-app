import moment from 'moment-timezone';
import { FormattedMessage } from '../types/index';

/**
 * @param username - The username of the message sender
 * @param text - The message text content
 * @returns Formatted message object with timestamp
 */
function formatMessage(username: string, text: string): FormattedMessage {
  return {
    username,
    text,
    time: moment().tz('Asia/Dhaka').format('h:mm a'),
  };
}

export default formatMessage;
