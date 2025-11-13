const { Kafka } = require('kafkajs');
const dotenv = require('dotenv');
const log4js = require('log4js');
dotenv.config();

const logger = log4js.getLogger('consumer');
logger.level = process.env.LOG_LEVEL || 'info';


const kafka = new Kafka({
  clientId: 'my-album-shelf-consumer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: { initialRetryTime: 100, retries: 8 }
});

const consumer = kafka.consumer({
  groupId: 'my-album-shelf-consumer-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});


const processUserActivity = (msg) => {
  if (!msg?.value) return;
  const payload = JSON.parse(msg.value.toString());

  logger.info('User activity processed', {
    category: 'USER_ACTIVITY',
    userId: payload.userId,
    action: payload.action,
    ipAddress: payload.ipAddress,
    timestamp: payload.timestamp,
    partition: msg.partition,
    offset: msg.offset
  });
};

const processDatabaseChange = (msg) => {
  if (!msg?.value) return;
  const payload = JSON.parse(msg.value.toString());

  logger.info('Database change processed', {
    category: 'DB_CHANGE',
    operation: payload.operation,
    table: payload.table,
    timestamp: payload.timestamp,
    partition: msg.partition,
    offset: msg.offset
  });
};

const processTiCDC = (msg) => {
  if (!msg?.value) return;
  const payload = JSON.parse(msg.value.toString());

  logger.info('TiCDC change processed', {
    category: 'TICDC',
    type: payload.type,
    database: payload.database,
    table: payload.table,
    timestamp: payload.ts || new Date().toISOString(),
    partition: msg.partition,
    offset: msg.offset
  });
};

async function start() {
  try {
    logger.info('Starting Kafka consumer', {
      broker: process.env.KAFKA_BROKER || 'localhost:9092'
    });

    await consumer.connect();
    logger.info('Kafka consumer connected');

    await consumer.subscribe({
      topics: ['user_activities', 'database_changes', 'tidb_changes'],
      fromBeginning: false
    });

    logger.info('Subscribed to topics', {
      topics: ['user_activities', 'database_changes', 'tidb_changes']
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message?.value) return;

          const msg = {
            value: message.value,
            partition,
            offset: message.offset
          };

          switch (topic) {
            case 'user_activities':
              return processUserActivity(msg);
            case 'database_changes':
              return processDatabaseChange(msg);
            case 'tidb_changes':
              return processTiCDC(msg);
            default:
              return logger.warn('Received message from unknown topic', {
                topic,
                partition,
                offset: message.offset
              });
          }
        } catch (err) {
          logger.error('Error processing message', {
            topic,
            partition,
            offset: message?.offset,
            error: err.message
          });
        }
      }
    });

  } catch (err) {
    logger.error('Failed to start consumer', {
      error: err.message,
      stack: err.stack
    });
    process.exit(1);
  }
}

const shutdown = async () => {
  logger.info('Shutting down consumer gracefully...');
  try {
    await consumer.disconnect();
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', {
    reason: reason?.message || reason
  });
  process.exit(1);
});

start();