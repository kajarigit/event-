const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
      maxlength: [200, 'Event name cannot exceed 200 characters'],
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
      validate: {
        validator: function(value) {
          return value > this.startTime;
        },
        message: 'End time must be after start time'
      }
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true
    },
    allowVoting: {
      type: Boolean,
      default: true
    },
    allowFeedback: {
      type: Boolean,
      default: true
    },
    maxVotesPerStudent: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    venue: {
      type: String,
      trim: true
    },
    capacity: {
      type: Number,
      min: 0
    },
    // Statistics (cached)
    stats: {
      totalCheckIns: { type: Number, default: 0 },
      totalFeedbacks: { type: Number, default: 0 },
      totalVotes: { type: Number, default: 0 },
      uniqueStudents: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for checking if event is currently active
eventSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && now >= this.startTime && now <= this.endTime;
});

// Indexes
eventSchema.index({ isActive: 1, startTime: -1 });
eventSchema.index({ createdBy: 1, startTime: -1 });

module.exports = mongoose.model('Event', eventSchema);
