const mongoose = require('mongoose');

const FamilyMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    relation: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    dob: { type: Date },
    address: {
      houseNo: String,
      place: String,
      city: String,
      state: String,
      country: String,
    },
    occupation: { type: String },
    photo: { type: String }, // Cloudinary URL
    photoPublicId: { type: String }, // Cloudinary public_id for cleanup
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FamilyMember', FamilyMemberSchema);
