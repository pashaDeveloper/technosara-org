const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const baseSchema = require('./baseSchema.model');
const Address = require('./address.model');
const addressInfoSchema = new mongoose.Schema({
  province: Address.schema.obj.province,
  city: Address.schema.obj.city,
  address: Address.schema.obj.address,
  plateNumber: Address.schema.obj.plateNumber,
  postalCode: Address.schema.obj.postalCode,
}, { _id: false });

const schema = new mongoose.Schema({
  ...baseSchema.obj,
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  phone: {
    type: String,
    default: '',
    trim: true,
    match: /^(?:09\d{9})?$/,
  },
  addressInfo: {
    type: addressInfoSchema,
    default: () => ({}),
  },
  nationalCode: {
    type: String,
    default: '',
    trim: true,
    match: /^(?:\d{10})?$/,
  },
  identityNumber: {
    type: String,
    default: '',
    trim: true,
    maxlength: 20,
  },
  birthDate: {
    type: Date,
    default: null,
  },
  bio: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true,
    validate: validator.isEmail,
  },
  avatar: {
    url: {
      type: String,
      default: '',
    },
    public_id: String,
    storage: String,
    copies: mongoose.Schema.Types.Mixed,
    blur: mongoose.Schema.Types.Mixed,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'superAdmin'],
    default: 'admin',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  profileApproval: {
    approvedLevel: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
    },
    pendingLevel: {
      type: Number,
      enum: [0, 2, 3],
      default: 0,
    },
    rejectionReason: {
      type: String,
      default: '',
      maxlength: 500,
    },
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
}, {
  timestamps: true,
  optimisticConcurrency: true,
});

schema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: 'superAdmin' } });

schema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

schema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});
module.exports = mongoose.model('Admin', schema);
