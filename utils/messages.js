// dependencies
const moment = require('moment-timezone');

function formatMessage(username, text) {
   return {
      username,
      text,
      time: moment().tz('Asia/Karachi').format('h:mm a'),
   };
}

module.exports = formatMessage;
