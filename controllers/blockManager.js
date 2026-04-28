const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { generateKeyPair, encryptBlock, decryptBlock } = require('./encryptionManager');

const BLOCK_SIZE = 256 * 1024; // 256KB blocks for demo visibility
const NODES = ['node1', 'node2', 'node3'];
const META_DIR = path.join(__dirname, '..', 'storage', 'metadata');
const STORAGE_BASE = path.join(__dirname, '..', 'storage');

/**
 * Get metadata file path
 */
function getMetaPath() {
  return path.join(META_DIR, 'namespace.json');
}

/**
 * Load namespace metadata
 */
function loadNamespace() {
  const p = getMetaPath();
  if (!fs.existsSync(p)) return { files: {} };
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/**
 * Save namespace metadata
 */
function saveNamespace(ns) {
  fs.writeFileSync(getMetaPath(), JSON.stringify(ns, null, 2));
}

/**
 * Split file into blocks, encrypt, distribute across nodes, save metadata
 */
function uploadFile(filePath, originalName) {
  const fileBuffer = fs.readFileSync(filePath);
  const fileSize = fileBuffer.length;
  const fileId = uuidv4();
  const { key, iv } = generateKeyPair();

  // Split into blocks
  const blocks = [];
  let offset = 0;
  let blockIndex = 0;

  while (offset < fileSize) {
    const end = Math.min(offset + BLOCK_SIZE, fileSize);
    const chunk = fileBuffer.slice(offset, end);

    // Encrypt the block
    const encrypted = encryptBlock(chunk, key, iv);

    // Assign to a node (round-robin)
    const nodeId = NODES[blockIndex % NODES.length];
    const blockId = `${fileId}_block_${blockIndex}`;

    // Write encrypted block to the node's directory
    const blockPath = path.join(STORAGE_BASE, nodeId, blockId);
    fs.writeFileSync(blockPath, encrypted);

    blocks.push({
      blockId,
      blockIndex,
      nodeId,
      originalSize: chunk.length,
      encryptedSize: encrypted.length
    });

    offset = end;
    blockIndex++;
  }

  // Save metadata in NameNode
  const ns = loadNamespace();
  ns.files[fileId] = {
    fileId,
    originalName,
    fileSize,
    blockSize: BLOCK_SIZE,
    blockCount: blocks.length,
    blocks,
    encryption: { algorithm: 'AES-256-CBC', key, iv },
    uploadedAt: new Date().toISOString(),
    replicationFactor: 1
  };
  saveNamespace(ns);

  // Clean up temp file
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  return ns.files[fileId];
}

/**
 * Reassemble & decrypt a file from its blocks
 */
function downloadFile(fileId) {
  const ns = loadNamespace();
  const fileMeta = ns.files[fileId];
  if (!fileMeta) return null;

  const { key, iv } = fileMeta.encryption;
  const sortedBlocks = [...fileMeta.blocks].sort((a, b) => a.blockIndex - b.blockIndex);
  const chunks = [];

  for (const block of sortedBlocks) {
    const blockPath = path.join(STORAGE_BASE, block.nodeId, block.blockId);
    const encrypted = fs.readFileSync(blockPath);
    const decrypted = decryptBlock(encrypted, key, iv);
    chunks.push(decrypted);
  }

  return {
    buffer: Buffer.concat(chunks),
    originalName: fileMeta.originalName
  };
}

/**
 * Delete a file and all its blocks
 */
function deleteFile(fileId) {
  const ns = loadNamespace();
  const fileMeta = ns.files[fileId];
  if (!fileMeta) return false;

  for (const block of fileMeta.blocks) {
    const blockPath = path.join(STORAGE_BASE, block.nodeId, block.blockId);
    if (fs.existsSync(blockPath)) fs.unlinkSync(blockPath);
  }

  delete ns.files[fileId];
  saveNamespace(ns);
  return true;
}

/**
 * List all files
 */
function listFiles() {
  const ns = loadNamespace();
  return Object.values(ns.files).map(f => ({
    fileId: f.fileId,
    originalName: f.originalName,
    fileSize: f.fileSize,
    blockCount: f.blockCount,
    blockSize: f.blockSize,
    uploadedAt: f.uploadedAt,
    encryption: f.encryption.algorithm
  }));
}

/**
 * Get detailed block info for a file
 */
function getFileBlocks(fileId) {
  const ns = loadNamespace();
  return ns.files[fileId] || null;
}

/**
 * Get node statistics
 */
function getNodeStats() {
  return NODES.map(nodeId => {
    const nodeDir = path.join(STORAGE_BASE, nodeId);
    let blockCount = 0, totalSize = 0;
    if (fs.existsSync(nodeDir)) {
      const files = fs.readdirSync(nodeDir);
      blockCount = files.length;
      files.forEach(f => {
        totalSize += fs.statSync(path.join(nodeDir, f)).size;
      });
    }
    return {
      nodeId,
      status: 'active',
      blockCount,
      storageUsed: totalSize,
      capacity: 100 * 1024 * 1024, // 100MB simulated capacity
      lastHeartbeat: new Date().toISOString()
    };
  });
}

/**
 * Get dashboard aggregate stats
 */
function getDashboardStats() {
  const ns = loadNamespace();
  const files = Object.values(ns.files);
  const nodes = getNodeStats();

  return {
    totalFiles: files.length,
    totalSize: files.reduce((sum, f) => sum + f.fileSize, 0),
    totalBlocks: files.reduce((sum, f) => sum + f.blockCount, 0),
    activeNodes: nodes.length,
    nodes,
    recentFiles: files.slice(-5).reverse()
  };
}

module.exports = {
  uploadFile, downloadFile, deleteFile,
  listFiles, getFileBlocks, getNodeStats, getDashboardStats
};
