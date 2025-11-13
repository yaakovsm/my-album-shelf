const log4js = require('log4js');

log4js.configure({
  appenders: {
    console: {
      type: 'stdout',
      layout: { type: 'pattern', pattern: '%d [%p] %c - %m' }
    },
    file: {
      type: 'file',
      filename: 'logs/app.log',
      maxLogSize: 10 * 1024 * 1024, // 10MB
      backups: 3,
      compress: true,
      layout: { type: 'pattern', pattern: '%d [%p] %c - %m' }
    }
  },
  categories: {
    default: { appenders: ['console', 'file'], level: process.env.LOG_LEVEL || 'info' }
  }
});

const logger = log4js.getLogger('backend');
module.exports = logger;