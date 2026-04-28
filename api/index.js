const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// ===== STORAGE PATHS (use /tmp on Vercel) =====
const BASE = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..');
const STORAGE = path.join(BASE, 'storage');
const NODES = ['node1', 'node2', 'node3'];
const META_DIR = path.join(STORAGE, 'metadata');
const BLOCK_SIZE = 256 * 1024;

// Ensure dirs
[...NODES.map(n => path.join(STORAGE, n)), META_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const upload = multer({ dest: path.join(BASE, 'uploads') });

// ===== ENCRYPTION =====
function encryptBlock(buf, key, iv) {
  const c = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
  return Buffer.concat([c.update(buf), c.final()]);
}
function decryptBlock(buf, key, iv) {
  const d = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
  return Buffer.concat([d.update(buf), d.final()]);
}

// ===== METADATA =====
function loadNS() {
  const p = path.join(META_DIR, 'namespace.json');
  if (!fs.existsSync(p)) return { files: {} };
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}
function saveNS(ns) {
  fs.writeFileSync(path.join(META_DIR, 'namespace.json'), JSON.stringify(ns, null, 2));
}

// ===== API ROUTES =====

// Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const buf = fs.readFileSync(req.file.path);
    const fileId = uuidv4();
    const key = crypto.randomBytes(32).toString('hex');
    const iv = crypto.randomBytes(16).toString('hex');
    const blocks = [];
    let offset = 0, idx = 0;

    while (offset < buf.length) {
      const chunk = buf.slice(offset, Math.min(offset + BLOCK_SIZE, buf.length));
      const enc = encryptBlock(chunk, key, iv);
      const nodeId = NODES[idx % NODES.length];
      const blockId = `${fileId}_block_${idx}`;
      fs.writeFileSync(path.join(STORAGE, nodeId, blockId), enc);
      blocks.push({ blockId, blockIndex: idx, nodeId, originalSize: chunk.length, encryptedSize: enc.length });
      offset += BLOCK_SIZE; idx++;
    }

    const ns = loadNS();
    ns.files[fileId] = {
      fileId, originalName: req.file.originalname, fileSize: buf.length,
      blockSize: BLOCK_SIZE, blockCount: blocks.length, blocks,
      encryption: { algorithm: 'AES-256-CBC', key, iv },
      uploadedAt: new Date().toISOString(), replicationFactor: 1
    };
    saveNS(ns);
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json({ success: true, file: ns.files[fileId] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Download
app.get('/api/download/:fileId', (req, res) => {
  try {
    const ns = loadNS();
    const f = ns.files[req.params.fileId];
    if (!f) return res.status(404).json({ error: 'Not found' });
    const chunks = [...f.blocks].sort((a, b) => a.blockIndex - b.blockIndex).map(b => {
      return decryptBlock(fs.readFileSync(path.join(STORAGE, b.nodeId, b.blockId)), f.encryption.key, f.encryption.iv);
    });
    res.setHeader('Content-Disposition', `attachment; filename="${f.originalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(Buffer.concat(chunks));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// List files
app.get('/api/files', (req, res) => {
  const ns = loadNS();
  res.json(Object.values(ns.files).map(f => ({
    fileId: f.fileId, originalName: f.originalName, fileSize: f.fileSize,
    blockCount: f.blockCount, blockSize: f.blockSize, uploadedAt: f.uploadedAt,
    encryption: f.encryption.algorithm
  })));
});

// Block details
app.get('/api/files/:fileId/blocks', (req, res) => {
  const ns = loadNS();
  const f = ns.files[req.params.fileId];
  if (!f) return res.status(404).json({ error: 'Not found' });
  res.json(f);
});

// Delete
app.delete('/api/files/:fileId', (req, res) => {
  const ns = loadNS();
  const f = ns.files[req.params.fileId];
  if (!f) return res.status(404).json({ error: 'Not found' });
  f.blocks.forEach(b => {
    const p = path.join(STORAGE, b.nodeId, b.blockId);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });
  delete ns.files[req.params.fileId];
  saveNS(ns);
  res.json({ success: true });
});

// Nodes
app.get('/api/nodes', (req, res) => {
  res.json(NODES.map(nodeId => {
    const dir = path.join(STORAGE, nodeId);
    let blockCount = 0, totalSize = 0;
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      blockCount = files.length;
      files.forEach(f => { totalSize += fs.statSync(path.join(dir, f)).size; });
    }
    return { nodeId, status: 'active', blockCount, storageUsed: totalSize, capacity: 100 * 1024 * 1024 };
  }));
});

// Dashboard
app.get('/api/dashboard', (req, res) => {
  const ns = loadNS();
  const files = Object.values(ns.files);
  const nodesData = NODES.map(nodeId => {
    const dir = path.join(STORAGE, nodeId);
    let blockCount = 0, totalSize = 0;
    if (fs.existsSync(dir)) {
      const f = fs.readdirSync(dir); blockCount = f.length;
      f.forEach(x => { totalSize += fs.statSync(path.join(dir, x)).size; });
    }
    return { nodeId, status: 'active', blockCount, storageUsed: totalSize, capacity: 100 * 1024 * 1024 };
  });
  res.json({
    totalFiles: files.length,
    totalSize: files.reduce((s, f) => s + f.fileSize, 0),
    totalBlocks: files.reduce((s, f) => s + f.blockCount, 0),
    activeNodes: NODES.length, nodes: nodesData,
    recentFiles: files.slice(-5).reverse()
  });
});

module.exports = app;
