const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema(
  {
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    stallId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stall',
      index: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    qrType: {
      type: String,
      enum: ['student', 'stall'],
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: [
        'gate-check-in',
        'gate-check-out',
        'stall-scan',
        'feedback-scan',
        'vote-scan',
        'manual-override'
      ],
      required: true,
      index: true
    },
    gate: {
      type: String,
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    deviceInfo: {
      userAgent: String,
      ipAddress: String,
      deviceId: String
    },
    isError: {
      type: Boolean,
      default: false,
      index: true
    },
    errorMessage: {
      type: String,
      trim: true
    },
    correctionNote: {
      type: String,
      trim: true
    },
    correctedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for analytics and filtering
scanLogSchema.index({ eventId: 1, timestamp: -1 });
scanLogSchema.index({ volunteerId: 1, timestamp: -1 });
scanLogSchema.index({ studentId: 1, eventId: 1, timestamp: -1 });
scanLogSchema.index({ eventId: 1, qrType: 1, action: 1 });

// TTL index - auto-delete logs older than 1 year (optional)
// scanLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('ScanLog', scanLogSchema);
