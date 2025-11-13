const { Kafka } = require('kafkajs');
const logger = require('./logger');

let producer = null;

function getBroker() {
  return process.env.KAFKA_BROKER || '';
}

function kafkaEnabled() {
  return !!getBroker();
}

async function connect() {
  if (!kafkaEnabled()) {
    logger.info('Kafka disabled (KAFKA_BROKER not set)');
    return;
  }
  const kafka = new Kafka({
    clientId: 'my-album-shelf-backend',
    brokers: [getBroker()],
    retry: { initialRetryTime: 200, retries: 8 },
  });

  producer = kafka.producer({ allowAutoTopicCreation: true });
  await producer.connect();
  logger.info('Kafka producer connected', { broker: getBroker() });
}

async function send(topic, payload) {
  if (!producer) {
    logger.warn('Kafka producer not connected; skipping send', { topic });
    return;
  }
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }],
  });
  logger.info('Kafka message sent', { topic });
}

async function sendUserActivity(action, userId, ipAddress, extra = {}) {
  return send('user_activities', {
    ts: new Date().toISOString(),
    category: 'USER_ACTIVITY',
    action,
    userId,
    ipAddress,
    ...extra,
  });
}

async function sendDatabaseChange(operation, table, extra = {}) {
  return send('database_changes', {
    ts: new Date().toISOString(),
    category: 'DATABASE_CHANGE',
    operation,
    table,
    ...extra,
  });
}

async function disconnect() {
  if (!producer) return;
  await producer.disconnect();
  logger.info('Kafka producer disconnected');
}

module.exports = { connect, send, sendUserActivity, sendDatabaseChange, disconnect };