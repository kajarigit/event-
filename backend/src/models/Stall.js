const mongoose = require('mongoose');

const stallSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Stall name is required'],
      trim: true,
      maxlength: [200, 'Stall name cannot exceed 200 characters'],
      index: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true
    },
    programme: {
      type: String,
      enum: ['B.Tech', 'M.Tech', 'MBA', 'MCA', 'PhD', 'General', 'Other'],
      default: 'General'
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    ownerName: {
      type: String,
      trim: true
    },
    ownerContact: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s-()]+$/, 'Please provide a valid contact number']
    },
    ownerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    qrToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    qrTokenExpiry: {
      type: Date
    },
    location: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    // Cached statistics
    stats: {
      totalFeedbacks: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0, min: 0, max: 5 },
      totalVotes: { type: Number, default: 0 },
      rank1Votes: { type: Number, default: 0 },
      rank2Votes: { type: Number, default: 0 },
      rank3Votes: { type: Number, default: 0 },
      totalScans: { type: Number, default: 0 }
    },
    images: [
      {
        type: String,
        trim: true
      }
    ],
    tags: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for weighted vote score (rank1=3pts, rank2=2pts, rank3=1pt)
stallSchema.virtual('weightedVoteScore').get(function() {
  return (
    this.stats.rank1Votes * 3 +
    this.stats.rank2Votes * 2 +
    this.stats.rank3Votes * 1
  );
});

// Compound indexes
stallSchema.index({ eventId: 1, department: 1 });
stallSchema.index({ eventId: 1, isActive: 1 });
stallSchema.index({ qrToken: 1, eventId: 1 });

module.exports = mongoose.model('Stall', stallSchema);
