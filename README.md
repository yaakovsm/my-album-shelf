# My Album Shelf

A full-stack application demonstrating SRE/DevOps practices with distributed systems, Change Data Capture, and event-driven architecture. Built with Node.js, React, TiDB, Apache Kafka, and Docker Compose.

## 1. Project Overview

My Album Shelf is a music album tracking application that showcases production-ready infrastructure patterns. The system implements user authentication, album management, real-time database change monitoring via TiCDC, and event streaming through Kafka. All services are containerized and orchestrated with Docker Compose, enabling single-command deployment and full environment reproducibility.

## 2. What This Project Demonstrates (SRE/DevOps Focus)

### Infrastructure & Orchestration
- **Docker Compose** service orchestration with dependency management
- **Health checks** for service readiness (TiDB, backend)
- **Dependency logic** ensuring correct startup order (PD → TiKV → TiDB → DB init → API)
- **Init containers** for database schema bootstrap

### Distributed Database
- **TiDB cluster** (PD + TiKV + TiDB) for scalable, distributed SQL storage
- **MySQL-compatible** protocol with horizontal scaling capabilities
- **Connection pooling** and graceful degradation

### Change Data Capture
- **TiCDC** captures all database changes (INSERT/UPDATE/DELETE) in real-time
- **Automatic CDC task** creation on startup
- **Kafka integration** streams changes to `tidb_changes` topic in canal-json format

### Event-Driven Architecture
- **Kafka topics**: `user_activities`, `database_changes`, `tidb_changes`
- **Producer/Consumer pattern** for decoupled event processing
- **Structured logging** with log4js (JSON console output)

### Consumer Service
- **Node.js consumer** processes Kafka messages from all topics
- **Structured logs** with category, operation type, timestamps
- **Error handling** and graceful shutdown

### Backend Authentication & Album Management
- **JWT-based authentication** with tokens stored in database
- **Token validation** via database lookup (not just JWT verification)
- **Album CRUD** operations with filtering and statistics

### Environment-Based Configuration
- **Environment variables** for all service configuration
- **No hardcoded values** in application code
- **Docker Compose** manages all service configs

### Full Reproducible Environment
- **Single command** deployment: `docker compose up`
- **Automatic initialization** of database schema and default user
- **No manual setup** required

## 3. Architecture Diagram

```
┌─────────────────┐
│   Frontend      │  React + Nginx
│   Port 3000     │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│   Backend API   │  Node.js + Express
│   Port 3001     │  ├─ Authentication (JWT)
└────────┬────────┘  └─ Album Management
         │
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
┌─────────────────┐            ┌─────────────────┐
│  TiDB Cluster   │            │  Kafka Broker   │
│                 │            │  Port 9092      │
│  PD  :2379      │            │  Port 29092     │
│  TiKV :20160    │            └────────┬────────┘
│  TiDB :4000     │                     │
└────────┬────────┘                     │
         │                               │
         │                               │
         ▼                               │
┌─────────────────┐                     │
│     TiCDC       │                     │
│  Port 8300      │                     │
│  (CDC Server)   │                     │
└────────┬────────┘                     │
         │                               │
         │ CDC Task                      │
         │ (app-cdc)                     │
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
              ┌─────────────────┐
              │    Consumer     │  Node.js + KafkaJS
              │  Processes:     │  ├─ user_activities
              │  - user_acts    │  ├─ database_changes
              │  - db_changes   │  └─ tidb_changes
              │  - tidb_changes │
              └─────────────────┘
```

## 4. Service-by-Service Breakdown

### frontend
- **Purpose**: React SPA for user interface
- **Ports**: 3000 (host) → 80 (container)
- **Technologies**: React 18, Nginx (production build)
- **Role**: Serves static assets, handles client-side routing
- **Dependencies**: Backend API (waits for `api` service)

### backend (api)
- **Purpose**: RESTful API server
- **Ports**: 3001
- **Technologies**: Node.js, Express, MySQL2, KafkaJS, log4js
- **Role**: 
  - Authentication endpoints (register, login, logout, profile, verify)
  - Album management (create, list with filters, statistics)
  - Publishes events to Kafka (`user_activities`, `database_changes`)
  - Structured JSON logging to console
- **Health Check**: `GET /health`
- **Dependencies**: TiDB (via `db` init completion), Kafka

### db-init
- **Purpose**: Database schema initialization and seeding
- **Ports**: None (one-time execution)
- **Technologies**: Node.js, mysql2, bcryptjs
- **Role**: 
  - Creates `my_album_shelf` database
  - Creates tables: `users`, `user_tokens`, `albums`
  - Seeds default admin user: `admin@my-album-shelf.local` / `admin123`
  - Inserts sample album
- **Dependencies**: TiDB (health check)
- **Restart Policy**: `no` (runs once, exits)

### TiDB Cluster

#### pd (Placement Driver)
- **Purpose**: Cluster metadata and scheduling
- **Ports**: 2379
- **Role**: Manages cluster topology, stores metadata

#### tikv (Storage Layer)
- **Purpose**: Distributed key-value storage
- **Ports**: 20160 (client), 20180 (status)
- **Role**: Persists data, handles transactions
- **Dependencies**: PD

#### tidb (SQL Layer)
- **Purpose**: MySQL-compatible SQL interface
- **Ports**: 4000 (MySQL protocol), 10080 (status/health)
- **Role**: Accepts SQL queries, routes to TiKV
- **Health Check**: `curl http://localhost:10080/status`
- **Dependencies**: PD, TiKV

### kafka + zookeeper

#### zookeeper
- **Purpose**: Kafka cluster coordination
- **Ports**: 2181
- **Role**: Manages Kafka broker metadata

#### kafka
- **Purpose**: Message broker for event streaming
- **Ports**: 9092 (host access), 29092 (Docker network)
- **Technologies**: Apache Kafka 7.5.0
- **Role**: 
  - Topics: `user_activities`, `database_changes`, `tidb_changes`
  - Auto-creates topics on first message
- **Dependencies**: Zookeeper

### ticdc + cdc-task

#### ticdc
- **Purpose**: Change Data Capture server
- **Ports**: 8300
- **Role**: Monitors TiDB cluster for changes, streams to Kafka
- **Dependencies**: TiDB (health check), Kafka

#### cdc-task
- **Purpose**: Creates CDC changefeed configuration
- **Ports**: None
- **Role**: 
  - Waits for TiCDC to be ready
  - Creates changefeed `app-cdc` targeting `my_album_shelf.*` tables
  - Sinks to Kafka topic `tidb_changes` in canal-json format
- **Restart Policy**: `no` (runs once, exits)
- **Dependencies**: TiCDC

### consumer
- **Purpose**: Kafka message consumer
- **Ports**: None
- **Technologies**: Node.js, KafkaJS, log4js
- **Role**: 
  - Subscribes to: `user_activities`, `database_changes`, `tidb_changes`
  - Processes messages and logs in structured format
  - Handles TiCDC canal-json format
- **Dependencies**: Kafka

## 5. Quick Start Instructions

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ available RAM
- Ports available: 3000, 3001, 4000, 9092, 2181, 2379, 8300

### Start All Services
```bash
docker compose up
```

**First startup takes 2-3 minutes** as services initialize in order:
1. Infrastructure (PD, Zookeeper)
2. Storage (TiKV, Kafka)
3. SQL layer (TiDB)
4. CDC (TiCDC)
5. Initialization (db-init, cdc-task)
6. Application (backend, frontend, consumer)

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **TiDB**: `mysql://root@localhost:4000/my_album_shelf`
- **Kafka**: localhost:9092
- **TiCDC API**: http://localhost:8300

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f consumer
docker compose logs -f cdc-task
```

### Exec into Consumer Container
```bash
docker exec -it consumer sh
```

### Verify CDC Events
```bash
# Check if changefeed exists
docker exec -it ticdc /cdc cli changefeed list --server=http://ticdc:8300

# View consumer logs for TiCDC messages
docker compose logs consumer | grep -i "TICDC"
```

### Full Clean Restart
```bash
# Stop and remove all containers, networks, and volumes
docker compose down -v

# Start fresh
docker compose up
```

### Detached Mode
```bash
docker compose up -d
```

## 6. Default Credentials

Created automatically by `db/init.js`:

- **Email**: `admin@my-album-shelf.local`
- **Password**: `admin123`

## 7. API Endpoints

All endpoints return JSON. Include `Authorization: Bearer <token>` header for protected routes.

### Authentication

#### `POST /api/auth/register`
Register new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "User registered"
}
```

#### `POST /api/auth/login`
Login and receive JWT token.

**Request:**
```json
{
  "email": "admin@my-album-shelf.local",
  "password": "admin123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-12-25T12:00:00.000Z",
    "user": {
      "id": 1,
      "email": "admin@my-album-shelf.local",
      "firstName": "Admin",
      "lastName": "User"
    }
  }
}
```

#### `POST /api/auth/logout`
Invalidate token. Requires authentication.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### `GET /api/auth/profile`
Get current user profile. Requires authentication.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "admin@my-album-shelf.local",
    "firstName": "Admin",
    "lastName": "User",
    "createdAt": "2024-12-20T10:00:00.000Z",
    "lastLogin": "2024-12-20T11:00:00.000Z"
  }
}
```

#### `GET /api/auth/verify`
Verify token validity. Requires authentication.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "userId": 1,
    "email": "admin@my-album-shelf.local"
  }
}
```

### Albums

#### `POST /api/albums`
Create new album. Requires authentication.

**Request:**
```json
{
  "title": "Paradise Again",
  "artist": "Swedish House Mafia",
  "genre": "House",
  "rating": 5,
  "listenedAt": "2024-12-01"
}
```

**Validation:**
- `title`: 1-200 characters
- `artist`: 1-200 characters
- `genre`: 1-100 characters
- `rating`: integer 1-5
- `listenedAt`: ISO 8601 date (YYYY-MM-DD)

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Paradise Again",
    "artist": "Swedish House Mafia",
    "genre": "House",
    "rating": 5,
    "listenedAt": "2024-12-01"
  }
}
```

#### `GET /api/albums`
List user's albums with optional filters. Requires authentication.

**Query Parameters:**
- `genre` (optional): Filter by genre (string, 1-100 chars)
- `minRating` (optional): Minimum rating (integer, 1-5)
- `limit` (optional): Results per page (integer, 1-100, default: 20)
- `offset` (optional): Pagination offset (integer ≥ 0, default: 0)
- `orderBy` (optional): `listened_at`, `rating`, `created_at` (default: `listened_at`)
- `order` (optional): `asc`, `desc` (default: `desc`)

**Example:** `GET /api/albums?genre=House&minRating=4&limit=10&orderBy=rating&order=desc`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Paradise Again",
      "artist": "Swedish House Mafia",
      "genre": "House",
      "rating": 5,
      "listenedAt": "2024-12-01",
      "createdAt": "2024-12-20T10:00:00.000Z"
    }
  ]
}
```

#### `GET /api/albums/stats`
Get album statistics. Requires authentication.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total": 25,
    "avgRating": "4.20",
    "topRated": [
      {
        "id": 1,
        "title": "Paradise Again",
        "artist": "Swedish House Mafia",
        "genre": "House",
        "rating": 5,
        "listenedAt": "2024-12-01"
      }
    ],
    "byGenre": [
      {
        "genre": "House",
        "count": 10,
        "avgRating": "4.50"
      }
    ]
  }
}
```

### Health Check

#### `GET /health`
API health status.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "ts": "2024-12-20T10:00:00.000Z",
  "uptime": 3600,
  "env": "production"
}
```

## 8. Project Structure

```
my-album-shelf/
├── backend/
│   ├── config/
│   │   ├── database.js      # TiDB connection pool
│   │   ├── kafka.js         # Kafka producer
│   │   └── logger.js        # log4js configuration (JSON console)
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js          # Authentication endpoints
│   │   └── albums.js        # Album endpoints
│   ├── logs/                # Application logs
│   ├── Dockerfile
│   ├── server.js            # Express app entry
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── api.js          # API client
│   │   └── App.jsx
│   ├── Dockerfile           # Multi-stage: React build + Nginx
│   ├── nginx.conf
│   └── package.json
│
├── consumer/
│   ├── consumer.js          # Kafka consumer logic
│   ├── Dockerfile
│   └── package.json
│
├── db/
│   ├── init.js              # Schema creation + seeding
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yaml      # Service orchestration
└── README.md
```

## 9. Troubleshooting

### TiDB Not Ready

**Symptoms**: Backend fails to connect, db-init fails

**Check:**
```bash
docker compose logs tidb | grep -i "ready"
docker compose ps tidb  # Should show (healthy)
```

**Solution**: Wait 30-60 seconds for TiDB cluster to initialize. The `db` service automatically retries.

### Kafka Connectivity Issues

**Symptoms**: Backend can't publish events, consumer can't connect

**Check:**
```bash
docker compose logs kafka | grep -i "started"
docker exec -it kafka kafka-topics --bootstrap-server localhost:29092 --list
```

**Solution**: Ensure Zookeeper is running first. Kafka depends on Zookeeper.

### CDC Task Not Created

**Symptoms**: No TiCDC messages in consumer logs

**Check:**
```bash
docker compose logs cdc-task
docker exec -it ticdc /cdc cli changefeed list --server=http://ticdc:8300
```

**Solution**: 
- Verify TiCDC server is running: `docker compose ps ticdc`
- Check cdc-task logs for errors
- Manually create changefeed if needed (see cdc-task command in docker-compose.yaml)

### Frontend Can't Reach Backend

**Symptoms**: Network errors in browser console

**Check:**
```bash
curl http://localhost:3001/health
docker compose logs api
```

**Solution**: 
- Verify backend is running: `docker compose ps api`
- Check `REACT_APP_API_URL` in docker-compose.yaml (should be `http://localhost:3001`)
- Ensure backend health check passes

### Port Conflicts

**Symptoms**: Services fail to start, "port already in use" errors

**Solution**: 
- Check what's using ports: `netstat -tulpn | grep -E '3000|3001|4000|9092'`
- Modify ports in docker-compose.yaml if needed
- Stop conflicting services

### Consumer Not Receiving Messages

**Check:**
```bash
# View consumer logs
docker compose logs consumer -f

# Verify consumer is subscribed
docker exec -it consumer sh
# Inside container, check if process is running
ps aux | grep consumer

# Check Kafka topics have messages
docker exec -it kafka kafka-console-consumer --bootstrap-server localhost:29092 --topic user_activities --from-beginning
```

**Solution**:
- Verify Kafka is running and topics exist
- Check consumer logs for connection errors
- Ensure consumer group is properly configured

### Database Connection Errors

**Symptoms**: Backend logs show "DB not connected" or connection timeouts

**Check:**
```bash
docker compose logs api | grep -i "db\|database"
docker exec -it tidb mysql -u root -h 127.0.0.1 -P 4000 -e "SELECT 1"
```

**Solution**:
- Verify TiDB is healthy: `docker compose ps tidb`
- Check database name matches: `my_album_shelf` (underscores, not hyphens)
- Ensure db-init completed successfully

### Clean Restart

If services are in a bad state:
```bash
docker compose down -v
docker compose up
```

This removes all volumes and recreates everything from scratch.
