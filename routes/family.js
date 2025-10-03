const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const auth = require('../middleware/auth');
const requirePaid = require('../middleware/requirePaid');
const FamilyMember = require('../models/FamilyMember');
const { Types } = require('mongoose');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function buildTree(members) {
  const byId = new Map();
  members.forEach((m) => byId.set(String(m._id), { ...m.toObject(), children: [], spouse: null }));
  const roots = [];
  const processedAsSpouse = new Set(); // Track members already processed as spouses
  
  // First pass: Handle spouses to avoid them being processed as children
  for (const m of byId.values()) {
    const relation = (m.relation || '').toLowerCase();
    const isSpouse = relation === 'wife' || relation === 'husband';
    
    if (isSpouse && m.parentId) {
      const partner = byId.get(String(m.parentId));
      if (partner) {
        // Only set spouse reference on the partner, not both ways to avoid circular reference
        partner.spouse = { 
          _id: m._id, 
          name: m.name, 
          relation: m.relation, 
          gender: m.gender, 
          photo: m.photo,
          dob: m.dob,
          occupation: m.occupation,
          address: m.address
        };
        processedAsSpouse.add(String(m._id)); // Mark as processed
      }
    }
  }
  
  // Second pass: Handle children and roots
  for (const m of byId.values()) {
    const relation = (m.relation || '').toLowerCase();
    
    // Skip if already processed as spouse
    if (processedAsSpouse.has(String(m._id))) {
      continue;
    }
    
    // Define child relationships - only these come from parents
    const isChild = relation === 'son' || relation === 'daughter';
    
    if (isChild && m.parentId) {
      // Handle children: only son/daughter are actual children from parents
      const parent = byId.get(String(m.parentId));
      if (parent) {
        parent.children.push(m);
      } else {
        roots.push(m); // Orphaned, treat as root
      }
    } else {
      // Root member (no parent) or other relations like father, mother, self, etc.
      if (!m.parentId) {
        roots.push(m);
      } else {
        // Other relations with parentId - treat as roots to avoid confusion
        roots.push(m);
      }
    }
  }
  
  return roots;
}

// POST /api/family - create member (optional photo)
router.post('/', auth, requirePaid, upload.single('photo'), async (req, res) => {
  try {
    const {
      name,
      relation,
      gender,
      dob,
      occupation,
      parentId,
      address_houseNo,
      address_place,
      address_city,
      address_state,
      address_country,
    } = req.body;

    if (!name || !relation) return res.status(400).json({ message: 'name and relation are required' });

    let photoUrl = undefined;
    let photoPublicId = undefined;

    if (req.file) {
      const stream = cloudinary.uploader.upload_stream({ folder: 'family-album/members' }, async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error', error);
          return res.status(500).json({ message: 'Photo upload failed' });
        }
        try {
          const created = await FamilyMember.create({
            userId: req.user.id,
            name,
            relation,
            gender,
            dob: dob ? new Date(dob) : undefined,
            occupation,
            parentId: parentId ? new Types.ObjectId(parentId) : null,
            address: {
              houseNo: address_houseNo,
              place: address_place,
              city: address_city,
              state: address_state,
              country: address_country,
            },
            photo: result.secure_url,
            photoPublicId: result.public_id,
          });
          return res.status(201).json(created);
        } catch (e) {
          console.error(e);
          return res.status(500).json({ message: 'Failed to create member' });
        }
      });
      return stream.end(req.file.buffer);
    }

    const created = await FamilyMember.create({
      userId: req.user.id,
      name,
      relation,
      gender,
      dob: dob ? new Date(dob) : undefined,
      occupation,
      parentId: parentId ? new Types.ObjectId(parentId) : null,
      address: {
        houseNo: address_houseNo,
        place: address_place,
        city: address_city,
        state: address_state,
        country: address_country,
      },
      photo: photoUrl,
      photoPublicId,
    });
    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/family/member/:id - fetch single member for editing
router.get('/member/:id', auth, requirePaid, async (req, res) => {
  try {
    const member = await FamilyMember.findOne({ _id: req.params.id, userId: req.user.id });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/family/:userId - tree for user
router.get('/:userId', auth, requirePaid, async (req, res) => {
  try {
    const { userId } = req.params;
    if (String(req.user.id) !== String(userId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const members = await FamilyMember.find({ userId }).sort({ createdAt: 1 });
    const tree = buildTree(members);
    res.json(tree);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/family/:id - update member (optional new photo)
router.put('/:id', auth, requirePaid, upload.single('photo'), async (req, res) => {
  try {
    const member = await FamilyMember.findOne({ _id: req.params.id, userId: req.user.id });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const {
      name,
      relation,
      gender,
      dob,
      occupation,
      parentId,
      address_houseNo,
      address_place,
      address_city,
      address_state,
      address_country,
    } = req.body;

    if (name !== undefined) member.name = name;
    if (relation !== undefined) member.relation = relation;
    if (gender !== undefined) member.gender = gender;
    if (dob !== undefined) member.dob = dob ? new Date(dob) : undefined;
    if (occupation !== undefined) member.occupation = occupation;
    if (parentId !== undefined) member.parentId = parentId ? new Types.ObjectId(parentId) : null;
    if (address_houseNo !== undefined) member.address.houseNo = address_houseNo;
    if (address_place !== undefined) member.address.place = address_place;
    if (address_city !== undefined) member.address.city = address_city;
    if (address_state !== undefined) member.address.state = address_state;
    if (address_country !== undefined) member.address.country = address_country;

    const saveAndRespond = async () => {
      await member.save();
      res.json(member);
    };

    if (req.file) {
      // Replace existing photo
      const stream = cloudinary.uploader.upload_stream({ folder: 'family-album/members' }, async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error', error);
          return res.status(500).json({ message: 'Photo upload failed' });
        }
        try {
          // destroy old
          if (member.photoPublicId) {
            try { await cloudinary.uploader.destroy(member.photoPublicId); } catch {}
          }
          member.photo = result.secure_url;
          member.photoPublicId = result.public_id;
          await saveAndRespond();
        } catch (e) {
          console.error(e);
          res.status(500).json({ message: 'Failed to update member' });
        }
      });
      return stream.end(req.file.buffer);
    }

    await saveAndRespond();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/family/:id - delete member and subtree
router.delete('/:id', auth, requirePaid, async (req, res) => {
  try {
    const userId = req.user.id;
    const root = await FamilyMember.findOne({ _id: req.params.id, userId });
    if (!root) return res.status(404).json({ message: 'Member not found' });

    const all = await FamilyMember.find({ userId });
    const map = new Map();
    all.forEach((m) => map.set(String(m._id), m));

    // gather subtree ids
    const toDelete = [];
    const stack = [root];
    while (stack.length) {
      const cur = stack.pop();
      toDelete.push(cur);
      for (const m of all) {
        if (m.parentId && String(m.parentId) === String(cur._id)) stack.push(m);
      }
    }

    // delete photos
    for (const m of toDelete) {
      if (m.photoPublicId) {
        try { await cloudinary.uploader.destroy(m.photoPublicId); } catch {}
      }
    }

    const ids = toDelete.map((m) => m._id);
    await FamilyMember.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Deleted', count: ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
