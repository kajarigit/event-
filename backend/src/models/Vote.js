const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
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
    rank: {
      type: Number,
      required: [true, 'Rank is required'],
      min: [1, 'Rank must be at least 1'],
      max: [3, 'Rank cannot exceed 3'],
      validate: {
        validator: Number.isInteger,
        message: 'Rank must be an integer'
      },
      index: true
    },
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance'
    },
    votedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Unique constraint: one vote per student per rank per event
voteSchema.index(
  { studentId: 1, rank: 1, eventId: 1 },
  { unique: true }
);

// Compound indexes for analytics
voteSchema.index({ stallId: 1, eventId: 1, rank: 1 });
voteSchema.index({ eventId: 1, votedAt: -1 });

// Static method to check if student has completed all votes
voteSchema.statics.hasCompletedVoting = async function(studentId, eventId, maxVotes = 3) {
  const voteCount = await this.countDocuments({ studentId, eventId });
  return voteCount >= maxVotes;
};

// Static method to get student's current votes
voteSchema.statics.getStudentVotes = async function(studentId, eventId) {
  return await this.find({ studentId, eventId })
    .populate('stallId', 'name department')
    .sort({ rank: 1 });
};

module.exports = mongoose.model('Vote', voteSchema);
