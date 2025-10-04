const mongoose = require('mongoose');

const familyConnectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Connection identification
  connectionId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Connected nodes
  sourceNodeId: {
    type: String,
    required: true
  },
  targetNodeId: {
    type: String,
    required: true
  },
  
  // Relationship type
  relationshipType: {
    type: String,
    enum: [
      'spouse',           // husband/wife
      'parent-child',     // parent to child
      'child-parent',     // child to parent (reverse)
      'sibling',          // brother/sister
      'grandparent-grandchild',
      'grandchild-grandparent',
      'uncle-nephew',
      'aunt-niece',
      'cousin',
      'other'
    ],
    required: true
  },
  
  // Visual styling for the connection line
  style: {
    strokeColor: {
      type: String,
      default: '#6b7280'
    },
    strokeWidth: {
      type: Number,
      default: 2
    },
    strokeDasharray: {
      type: String,
      default: '' // solid line, use '5,5' for dashed
    },
    animated: {
      type: Boolean,
      default: false
    }
  },
  
  // Connection label (optional)
  label: {
    text: String,
    position: {
      type: Number,
      default: 0.5 // 0 = source, 1 = target, 0.5 = middle
    }
  }
}, {
  timestamps: true
});

// Ensure unique connections per user
familyConnectionSchema.index({ userId: 1, connectionId: 1 }, { unique: true });

// Prevent duplicate connections between same nodes
familyConnectionSchema.index({ 
  userId: 1, 
  sourceNodeId: 1, 
  targetNodeId: 1 
}, { unique: true });

module.exports = mongoose.model('FamilyConnection', familyConnectionSchema);
