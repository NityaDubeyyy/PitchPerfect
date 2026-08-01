// server/models/Session.js  (Phase 6)
// Added slides[] array and finalReport object

const mongoose = require('mongoose');

const slideDataSchema = new mongoose.Schema({
    index: { type: Number, required: true },
    transcript: { type: String, default: '' },
    metrics: {
        wpm: { type: Number, default: 0 },
        fillers: { type: Number, default: 0 },
        confidence: { type: Number, default: 0 },
    },
    coachingTip: { type: String, default: '' },
    topIssue: { type: String, default: '' },
    score: { type: Number, default: 0 },
}, { _id: false });

const sessionSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        filename: {
            type: String,
            required: true,
        },
        fileUrl: {
            type: String,
            required: true,
        },
        totalSlides: {
            type: Number,
            default: 0,
        },

        // Per-slide data — populated when session ends
        slides: [slideDataSchema],

        // Overall session report — computed when session ends
        finalReport: {
            overallScore: { type: Number, default: 0 },
            avgWPM: { type: Number, default: 0 },
            totalFillers: { type: Number, default: 0 },
            avgConfidence: { type: Number, default: 0 },
            bestSlide: { type: Number, default: 0 },
            worstSlide: { type: Number, default: 0 },
            topIssue: { type: String, default: '' },
            totalWords: { type: Number, default: 0 },
            durationSeconds: { type: Number, default: 0 },
        },

        // Session status
        status: {
            type: String,
            enum: ['created', 'presenting', 'completed'],
            default: 'created',
        },

        completedAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Session', sessionSchema);