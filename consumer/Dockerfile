FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p logs

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD ps -ef | grep "consumer.js" | grep -v grep || exit 1

CMD ["node", "consumer.js"]