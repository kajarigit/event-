const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    stallId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stall',
      required: true,
      index: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer'
      }
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    isAnonymous: {
      type: Boolean,
      default: false
    },
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance'
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Unique constraint: one feedback per student per stall per event
feedbackSchema.index(
  { studentId: 1, stallId: 1, eventId: 1 },
  { unique: true }
);

// Compound indexes for queries
feedbackSchema.index({ stallId: 1, eventId: 1, submittedAt: -1 });
feedbackSchema.index({ eventId: 1, rating: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
