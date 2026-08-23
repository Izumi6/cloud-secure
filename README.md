# ☁️ CloudSecure — SaaS Cloud Controller

> HDFS-like Distributed Storage with AES-256 Encryption

🔗 **Live Demo:** [cloud-secure-c411.vercel.app](https://cloud-secure-c411.vercel.app)

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
- **Mobile Responsive** — Hamburger sidebar on mobile

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| Node.js + Express | Backend API server |
| AES-256-CBC | Block-level encryption |
| Vanilla HTML/CSS/JS | Frontend dashboard |
| Multer | File upload handling |
| Vercel Serverless | Production deployment |

## Quick Start

```bash
npm install
npm start
```

**Default Login:** `admin@gmail.com` / `admin123`

Or register a new account via the sign-up form.

## Architecture

```
Upload → Split into 256KB blocks → Encrypt (AES-256-CBC) → Distribute across 3 DataNodes
Download → Collect blocks → Decrypt → Reassemble original file
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

## Author

**Suyash Vakhariya** — [suyashvakhariya.in](https://suyashvakhariya.in)
