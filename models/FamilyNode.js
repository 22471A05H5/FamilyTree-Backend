const mongoose = require('mongoose');

const familyNodeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Node identification
  nodeId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Personal information
  name: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  dateOfDeath: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  
  // Photo
  photo: {
    url: String,
    publicId: String // Cloudinary public ID
  },
  
  // Additional info
  occupation: String,
  location: String,
  notes: String,
  
  // Canvas position
  position: {
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    }
  },
  
  // Visual styling
  style: {
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    borderColor: {
      type: String,
      default: '#e5e7eb'
    },
    textColor: {
      type: String,
      default: '#374151'
    }
  }
}, {
  timestamps: true
});

// Ensure nodeId is unique per user
familyNodeSchema.index({ userId: 1, nodeId: 1 }, { unique: true });

module.exports = mongoose.model('FamilyNode', familyNodeSchema);
