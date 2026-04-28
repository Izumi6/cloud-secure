const express = require('express');
const multer = require('multer');
const path = require('path');
const bm = require('../controllers/blockManager');

const router = express.Router();

const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

// Upload file
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const result = bm.uploadFile(req.file.path, req.file.originalname);
    res.json({ success: true, file: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download file
router.get('/download/:fileId', (req, res) => {
  try {
    const result = bm.downloadFile(req.params.fileId);
    if (!result) return res.status(404).json({ error: 'File not found' });
    res.setHeader('Content-Disposition', `attachment; filename="${result.originalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(result.buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List files
router.get('/files', (req, res) => {
  res.json(bm.listFiles());
});

// Get file block details
router.get('/files/:fileId/blocks', (req, res) => {
  const data = bm.getFileBlocks(req.params.fileId);
  if (!data) return res.status(404).json({ error: 'File not found' });
  res.json(data);
});

// Delete file
router.delete('/files/:fileId', (req, res) => {
  const ok = bm.deleteFile(req.params.fileId);
  if (!ok) return res.status(404).json({ error: 'File not found' });
  res.json({ success: true });
});

// Node stats
router.get('/nodes', (req, res) => {
  res.json(bm.getNodeStats());
});

// Dashboard
router.get('/dashboard', (req, res) => {
  res.json(bm.getDashboardStats());
});

module.exports = router;
