// models/Registration.js - Mongoose schema for event registrations
const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    registrationId: {
      type: String,
      unique: true,
      trim: true,
    },
    participantName: {
      type: String,
      required: [true, 'Participant name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    eventName: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
      minlength: [2, 'Event name must be at least 2 characters'],
      maxlength: [150, 'Event name cannot exceed 150 characters'],
    },
    eventCategory: {
      type: String,
      required: [true, 'Event category is required'],
      enum: {
        values: ['Technical', 'Cultural', 'Sports', 'Academic', 'Workshop', 'Seminar', 'Other'],
        message: '{VALUE} is not a valid event category',
      },
    },
    registrationDate: {
      type: Date,
      required: [true, 'Registration date is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\+?[\d\s\-().]{7,20}$/, 'Please provide a valid phone number'],
    },
    fee: {
      type: Number,
      required: [true, 'Registration fee is required'],
      min: [0, 'Fee cannot be negative'],
    },
    paymentStatus: {
      type: String,
      required: [true, 'Payment status is required'],
      enum: {
        values: ['Paid', 'Pending', 'Failed'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'Pending',
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Indexes for faster search operations
registrationSchema.index({ participantName: 'text', eventName: 'text' });
registrationSchema.index({ eventCategory: 1 });
registrationSchema.index({ paymentStatus: 1 });
registrationSchema.index({ registrationDate: 1 });
registrationSchema.index({ fee: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
