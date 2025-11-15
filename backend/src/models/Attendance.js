const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    inTimestamp: {
      type: Date,
      required: true,
      index: true
    },
    outTimestamp: {
      type: Date,
      index: true
    },
    durationSeconds: {
      type: Number,
      min: 0
    },
    gate: {
      type: String,
      trim: true
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['checked-in', 'checked-out'],
      default: 'checked-in',
      index: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for queries
attendanceSchema.index({ studentId: 1, eventId: 1, inTimestamp: -1 });
attendanceSchema.index({ eventId: 1, status: 1, inTimestamp: -1 });
attendanceSchema.index({ studentId: 1, eventId: 1, status: 1 });

// Pre-save hook to calculate duration
attendanceSchema.pre('save', function(next) {
  if (this.outTimestamp && this.inTimestamp) {
    this.durationSeconds = Math.floor(
      (this.outTimestamp - this.inTimestamp) / 1000
    );
    this.status = 'checked-out';
  } else {
    this.durationSeconds = null;
    this.status = 'checked-in';
  }
  next();
});

// Static method to get current attendance status
attendanceSchema.statics.getCurrentStatus = async function(studentId, eventId) {
  const attendance = await this.findOne({
    studentId,
    eventId,
    status: 'checked-in'
  }).sort({ inTimestamp: -1 });
  
  return attendance;
};

// Static method to check if student is currently checked in
attendanceSchema.statics.isCheckedIn = async function(studentId, eventId) {
  const attendance = await this.getCurrentStatus(studentId, eventId);
  return !!attendance;
};

module.exports = mongoose.model('Attendance', attendanceSchema);
