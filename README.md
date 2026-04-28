# CloudSecure

SaaS Cloud Controller with HDFS-like Distributed Storage & AES-256 Encryption

## Overview

CloudSecure is a cloud controller that demonstrates distributed file storage concepts inspired by Hadoop HDFS. Files are split into blocks, encrypted with AES-256-CBC, and distributed across simulated DataNodes.

## Features

- **HDFS-like File Chunking** — Files split into 256KB blocks
- **AES-256-CBC Encryption** — Every block encrypted before storage
- **3 Simulated DataNodes** — Round-robin block distribution
- **Admin Login/Register** — Role-based access (admin/user)
- **Star/Favourite Files** — Mark important files
- **Block Visualization** — See which blocks are on which nodes
- **Node Monitoring** — Real-time DataNode status
- **Admin Panel** — User management & cluster config

## Tech Stack

- **Backend:** Node.js + Express.js
- **Encryption:** Node.js `crypto` (AES-256-CBC)
- **Storage:** Local filesystem (simulated DataNodes)
- **Frontend:** Vanilla HTML/CSS/JS

## Setup

```bash
npm install
npm start
```

Open http://localhost:3000

**Default Login:** `admin@cloudsecure.io` / `admin123`

## Architecture

```
Upload → Split into blocks → Encrypt each block → Distribute across nodes
Download → Collect blocks from nodes → Decrypt → Reassemble original file
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload | Upload & distribute file |
| GET | /api/download/:id | Download & decrypt file |
| GET | /api/files | List all files |
| GET | /api/files/:id/blocks | Block distribution details |
| DELETE | /api/files/:id | Delete file & blocks |
| GET | /api/nodes | DataNode status |
| GET | /api/dashboard | Cluster statistics |
