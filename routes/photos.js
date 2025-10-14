const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const Photo = require('../models/Photo');
const auth = require('../middleware/auth');

const router = express.Router();

// Multer v2 memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// POST /api/photos/upload
router.post('/upload', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const category = req.body.category || 'general';

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'family-album' },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error', error);
          return res.status(500).json({ message: 'Upload failed' });
        }

        const photo = await Photo.create({
          url: result.secure_url,
          public_id: result.public_id,
          category,
          uploadedBy: req.user.id
        });

        return res.status(201).json(photo);
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/photos
router.get('/', auth, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { uploadedBy: req.user.id };
    if (category) filter.category = category;
    const photos = await Photo.find(filter).sort({ createdAt: -1 });
    res.json(photos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/photos/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const photo = await Photo.findOne({ _id: req.params.id, uploadedBy: req.user.id });
    if (!photo) return res.status(404).json({ message: 'Photo not found' });

    await cloudinary.uploader.destroy(photo.public_id);
    await photo.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
