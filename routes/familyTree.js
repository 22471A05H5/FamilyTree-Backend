const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const auth = require('../middleware/auth');
const FamilyNode = require('../models/FamilyNode');
const FamilyConnection = require('../models/FamilyConnection');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/family-tree - Get user's complete family tree
router.get('/', auth, async (req, res) => {
  try {
    const [nodes, connections] = await Promise.all([
      FamilyNode.find({ userId: req.user.id }).sort({ createdAt: 1 }),
      FamilyConnection.find({ userId: req.user.id }).sort({ createdAt: 1 })
    ]);

    console.log(`🔍 Loading family tree for user ${req.user.id}:`);
    console.log(`📊 Found ${nodes.length} nodes in database:`, nodes.map(n => `${n.name} (${n.nodeId})`));
    console.log(`🔗 Found ${connections.length} connections in database`);

    // Transform nodes for React Flow format
    const reactFlowNodes = nodes.map(node => ({
      id: node.nodeId,
      type: 'familyMember',
      position: node.position,
      data: {
        name: node.name,
        dateOfBirth: node.dateOfBirth,
        dateOfDeath: node.dateOfDeath,
        gender: node.gender,
        photo: node.photo,
        occupation: node.occupation,
        location: node.location,
        notes: node.notes,
        onEdit: () => {}, // Will be handled by frontend
        onDelete: () => {} // Will be handled by frontend
      },
      style: node.style
    }));

    // Transform connections for React Flow format
    const reactFlowEdges = connections.map(connection => ({
      id: connection.connectionId,
      source: connection.sourceNodeId,
      target: connection.targetNodeId,
      type: 'smoothstep',
      label: connection.relationshipType,
      labelStyle: { fontSize: 12, fontWeight: 600 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
      style: connection.style,
      data: {
        relationshipType: connection.relationshipType
      }
    }));

    res.json({
      nodes: reactFlowNodes,
      edges: reactFlowEdges
    });
  } catch (error) {
    console.error('Get family tree error:', error);
    res.status(500).json({ message: 'Failed to load family tree' });
  }
});

// POST /api/family-tree/node - Add or update family member
router.post('/node', auth, upload.single('photo'), async (req, res) => {
  try {
    const {
      nodeId,
      name,
      dateOfBirth,
      dateOfDeath,
      gender,
      occupation,
      location,
      notes,
      positionX,
      positionY,
      isEditing
    } = req.body;

    let photoData = null;

    // Upload photo to Cloudinary if provided
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'family-tree',
              transformation: [
                { width: 200, height: 200, crop: 'fill', gravity: 'face' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(req.file.buffer);
        });

        photoData = {
          url: result.secure_url,
          publicId: result.public_id
        };
      } catch (uploadError) {
        console.error('Photo upload error:', uploadError);
        // Continue without photo if upload fails
      }
    }

    if (isEditing === 'true') {
      // Update existing node
      const updateData = {
        name,
        gender,
        occupation,
        location,
        notes,
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(dateOfDeath && { dateOfDeath: new Date(dateOfDeath) }),
        ...(positionX !== undefined && positionY !== undefined && {
          position: { x: parseFloat(positionX), y: parseFloat(positionY) }
        }),
        ...(photoData && { photo: photoData })
      };

      const updatedNode = await FamilyNode.findOneAndUpdate(
        { userId: req.user.id, nodeId },
        updateData,
        { new: true }
      );

      if (!updatedNode) {
        return res.status(404).json({ message: 'Family member not found' });
      }

      res.json({
        id: updatedNode.nodeId,
        type: 'familyMember',
        position: updatedNode.position,
        data: {
          name: updatedNode.name,
          dateOfBirth: updatedNode.dateOfBirth,
          dateOfDeath: updatedNode.dateOfDeath,
          gender: updatedNode.gender,
          photo: updatedNode.photo,
          occupation: updatedNode.occupation,
          location: updatedNode.location,
          notes: updatedNode.notes
        }
      });
    } else {
      // Create new node
      const newNode = new FamilyNode({
        userId: req.user.id,
        nodeId: nodeId || `node-${Date.now()}`,
        name,
        gender,
        occupation,
        location,
        notes,
        position: {
          x: positionX ? parseFloat(positionX) : Math.random() * 400,
          y: positionY ? parseFloat(positionY) : Math.random() * 300
        },
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(dateOfDeath && { dateOfDeath: new Date(dateOfDeath) }),
        ...(photoData && { photo: photoData })
      });

      await newNode.save();

      res.status(201).json({
        id: newNode.nodeId,
        type: 'familyMember',
        position: newNode.position,
        data: {
          name: newNode.name,
          dateOfBirth: newNode.dateOfBirth,
          dateOfDeath: newNode.dateOfDeath,
          gender: newNode.gender,
          photo: newNode.photo,
          occupation: newNode.occupation,
          location: newNode.location,
          notes: newNode.notes
        }
      });
    }
  } catch (error) {
    console.error('Add/update family member error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Family member with this ID already exists' });
    } else {
      res.status(500).json({ message: 'Failed to save family member' });
    }
  }
});

// DELETE /api/family-tree/node/:nodeId - Complete family member deletion
router.delete('/node/:nodeId', auth, async (req, res) => {
  try {
    const { nodeId } = req.params;
    console.log(`🗑️ Deleting family member: ${nodeId} for user: ${req.user.id}`);

    // First, check if node exists
    const existingNode = await FamilyNode.findOne({
      userId: req.user.id,
      nodeId
    });

    if (!existingNode) {
      console.log(`❌ Family member not found: ${nodeId} for user: ${req.user.id}`);
      console.log(`🔍 Available nodes for user:`, await FamilyNode.find({ userId: req.user.id }).select('nodeId name'));
      return res.status(404).json({ message: 'Family member not found' });
    }

    console.log(`✅ Found family member to delete: ${existingNode.name} (${existingNode.nodeId})`);

    // Delete the node from database
    const deletedNode = await FamilyNode.findOneAndDelete({
      userId: req.user.id,
      nodeId
    });

    console.log(`✅ Deleted family member: ${deletedNode.name}`);

    // Delete all associated connections
    const deletedConnections = await FamilyConnection.deleteMany({
      userId: req.user.id,
      $or: [
        { sourceNodeId: nodeId },
        { targetNodeId: nodeId }
      ]
    });

    console.log(`✅ Deleted ${deletedConnections.deletedCount} connections for ${deletedNode.name}`);

    // Delete photo from Cloudinary if exists
    if (deletedNode.photo?.publicId) {
      try {
        await cloudinary.uploader.destroy(deletedNode.photo.publicId);
        console.log(`✅ Deleted photo from Cloudinary: ${deletedNode.photo.publicId}`);
      } catch (cloudinaryError) {
        console.error('❌ Cloudinary delete error:', cloudinaryError);
        // Continue even if photo deletion fails
      }
    }

    res.json({ 
      message: 'Family member completely deleted',
      deletedMember: deletedNode.name,
      deletedConnections: deletedConnections.deletedCount,
      photoDeleted: !!deletedNode.photo?.publicId
    });
  } catch (error) {
    console.error('❌ Delete family member error:', error);
    res.status(500).json({ message: 'Failed to delete family member' });
  }
});

// POST /api/family-tree/connection - Add connection between family members
router.post('/connection', auth, async (req, res) => {
  try {
    const {
      connectionId,
      sourceNodeId,
      targetNodeId,
      relationshipType,
      style
    } = req.body;

    const newConnection = new FamilyConnection({
      userId: req.user.id,
      connectionId: connectionId || `connection-${Date.now()}`,
      sourceNodeId,
      targetNodeId,
      relationshipType,
      style: style || {}
    });

    await newConnection.save();

    res.status(201).json({
      id: newConnection.connectionId,
      source: newConnection.sourceNodeId,
      target: newConnection.targetNodeId,
      type: 'smoothstep',
      label: newConnection.relationshipType,
      data: {
        relationshipType: newConnection.relationshipType
      }
    });
  } catch (error) {
    console.error('Add connection error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Connection already exists between these members' });
    } else {
      res.status(500).json({ message: 'Failed to create connection' });
    }
  }
});

// DELETE /api/family-tree/connection/:connectionId - Delete connection
router.delete('/connection/:connectionId', auth, async (req, res) => {
  try {
    const { connectionId } = req.params;

    const deletedConnection = await FamilyConnection.findOneAndDelete({
      userId: req.user.id,
      connectionId
    });

    if (!deletedConnection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    res.json({ message: 'Connection deleted successfully' });
  } catch (error) {
    console.error('Delete connection error:', error);
    res.status(500).json({ message: 'Failed to delete connection' });
  }
});

// PUT /api/family-tree/save - Save entire tree state (positions and connections)
router.put('/save', auth, async (req, res) => {
  try {
    const { nodes, edges } = req.body;

    // Update node positions
    if (nodes && nodes.length > 0) {
      const updatePromises = nodes.map(node =>
        FamilyNode.findOneAndUpdate(
          { userId: req.user.id, nodeId: node.id },
          { position: node.position },
          { new: true }
        )
      );
      await Promise.all(updatePromises);
    }

    // Handle edge updates (connections)
    if (edges && edges.length > 0) {
      // Get existing connections
      const existingConnections = await FamilyConnection.find({ userId: req.user.id });
      const existingConnectionIds = existingConnections.map(conn => conn.connectionId);
      const newConnectionIds = edges.map(edge => edge.id);

      // Delete removed connections
      const connectionsToDelete = existingConnectionIds.filter(id => !newConnectionIds.includes(id));
      if (connectionsToDelete.length > 0) {
        await FamilyConnection.deleteMany({
          userId: req.user.id,
          connectionId: { $in: connectionsToDelete }
        });
      }

      // Add new connections
      const connectionsToAdd = edges.filter(edge => !existingConnectionIds.includes(edge.id));
      if (connectionsToAdd.length > 0) {
        const newConnections = connectionsToAdd.map(edge => ({
          userId: req.user.id,
          connectionId: edge.id,
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          relationshipType: edge.data?.relationshipType || 'other'
        }));
        await FamilyConnection.insertMany(newConnections);
      }
    }

    res.json({ message: 'Family tree saved successfully' });
  } catch (error) {
    console.error('Save family tree error:', error);
    res.status(500).json({ message: 'Failed to save family tree' });
  }
});

// DELETE /api/family-tree/debug-delete/:name - Debug: Delete specific member by name
router.delete('/debug-delete/:name', auth, async (req, res) => {
  try {
    const { name } = req.params;
    console.log(`🗑️ DEBUG: Deleting member named "${name}" for user: ${req.user.id}`);

    // Find and delete the node by name
    const deletedNode = await FamilyNode.findOneAndDelete({
      userId: req.user.id,
      name: { $regex: new RegExp(name, 'i') } // Case insensitive search
    });

    if (!deletedNode) {
      console.log(`❌ Member "${name}" not found`);
      return res.status(404).json({ message: `Member "${name}" not found` });
    }

    // Delete associated connections
    const deletedConnections = await FamilyConnection.deleteMany({
      userId: req.user.id,
      $or: [
        { sourceNodeId: deletedNode.nodeId },
        { targetNodeId: deletedNode.nodeId }
      ]
    });

    console.log(`✅ DEBUG: Deleted "${deletedNode.name}" and ${deletedConnections.deletedCount} connections`);

    res.json({ 
      message: `Successfully deleted ${deletedNode.name}`,
      deletedMember: deletedNode.name,
      deletedConnections: deletedConnections.deletedCount
    });
  } catch (error) {
    console.error('❌ Debug delete error:', error);
    res.status(500).json({ message: 'Failed to delete member' });
  }
});

// DELETE /api/family-tree/clear-all - Emergency: Delete ALL family tree data for user
router.delete('/clear-all', auth, async (req, res) => {
  try {
    console.log(`🗑️ CLEARING ALL family tree data for user: ${req.user.id}`);

    // Delete all nodes for this user
    const deletedNodes = await FamilyNode.deleteMany({ userId: req.user.id });
    console.log(`✅ Deleted ${deletedNodes.deletedCount} nodes`);

    // Delete all connections for this user
    const deletedConnections = await FamilyConnection.deleteMany({ userId: req.user.id });
    console.log(`✅ Deleted ${deletedConnections.deletedCount} connections`);

    // Note: We're not deleting Cloudinary photos here to avoid issues
    // They will be cleaned up over time or manually

    res.json({ 
      message: 'All family tree data cleared successfully',
      deletedNodes: deletedNodes.deletedCount,
      deletedConnections: deletedConnections.deletedCount
    });
  } catch (error) {
    console.error('❌ Clear all family tree error:', error);
    res.status(500).json({ message: 'Failed to clear family tree data' });
  }
});

// EMERGENCY DELETE - Remove ALL family tree data immediately
router.post('/nuclear-delete', auth, async (req, res) => {
  try {
    console.log(`🔥 NUCLEAR DELETE: Wiping ALL family tree data for user: ${req.user.id}`);

    // Delete EVERYTHING for this user - no questions asked
    const [deletedNodes, deletedConnections] = await Promise.all([
      FamilyNode.deleteMany({ userId: req.user.id }),
      FamilyConnection.deleteMany({ userId: req.user.id })
    ]);

    console.log(`🔥 NUCLEAR DELETE COMPLETE:`);
    console.log(`   - Deleted ${deletedNodes.deletedCount} nodes`);
    console.log(`   - Deleted ${deletedConnections.deletedCount} connections`);
    console.log(`   - User ${req.user.id} family tree is now EMPTY`);

    res.json({
      success: true,
      message: 'ALL family tree data permanently deleted',
      deletedNodes: deletedNodes.deletedCount,
      deletedConnections: deletedConnections.deletedCount
    });
  } catch (error) {
    console.error('🔥 NUCLEAR DELETE ERROR:', error);
    res.status(500).json({ error: 'Nuclear delete failed' });
  }
});

module.exports = router;
