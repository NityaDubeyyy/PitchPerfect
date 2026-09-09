// server/socket/handlers.js  (Phase 6)
// Key change: end_session now saves full report to MongoDB

const { transcribeAudio, isPythonServiceAlive } = require('../utils/transcribe');
const { wpmTool, fillerTool, confidenceTool, alignmentTool, cleanupSession } = require('../langchain/tools');
const { runCoachingAgent } = require('../langchain/agent');
const Session = require('../models/Session');

module.exports = function registerSocketHandlers(io) {

    const sessionStore = {};

    isPythonServiceAlive().then((alive) => {
        if (alive) {
            console.log('✅ Python Whisper service running on port 8001');
        } else {
            console.warn('⚠️  Python Whisper NOT running — start Terminal 3');
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Connected: ${socket.id}`);

        // ── join_session ────────────────────────────────────────
        socket.on('join_session', ({ sessionId }) => {
            socket.join(sessionId);
            console.log(`📋 Joined session: ${sessionId}`);

            if (!sessionStore[sessionId]) {
                sessionStore[sessionId] = {
                    transcripts: {},  // { slideIndex: "full text" }
                    slideTexts: {},   // { slideIndex: "slide text" }
                    metrics: {},  // { slideIndex: { wpm, fillers, confidence, alignmentScore, verbatimMatchPct, isReadingSlide } }
                    tips: {},  // { slideIndex: "tip text" }
                    topIssues: {},  // { slideIndex: "fillers|pace|confidence|alignment" }
                    slideIndex: 0,
                    startTime: Date.now(),
                };
            }

            socket.emit('session_joined', {
                sessionId,
                message: 'Connected to real-time session',
            });
        });

        // ── slide_texts ────────────────────────────────────────
        socket.on('slide_texts', ({ sessionId, slideTexts }) => {
            if (sessionStore[sessionId]) {
                sessionStore[sessionId].slideTexts = slideTexts || {};
                console.log(`📑 Received slide texts for ${sessionId} (${Object.keys(slideTexts || {}).length} slides)`);
            }
        });

        // ── audio_chunk ─────────────────────────────────────────
        socket.on('audio_chunk', async (data) => {
            const { slideIndex, sessionId, audioData } = data;

            if (!sessionStore[sessionId]) return;

            const sizeKB = audioData
                ? Math.round(Buffer.byteLength(audioData) / 1024)
                : 0;
            console.log(`🎙️  Chunk | slide: ${slideIndex} | ${sizeKB}KB`);

            const audioBuffer = Buffer.from(audioData);
            const transcript = await transcribeAudio(audioBuffer);

            if (!transcript || transcript.trim() === '') {
                console.log('   (empty — filtered)');
                return;
            }

            const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
            if (wordCount < 2) {
                console.log(`   (too short: "${transcript}" — skipping)`);
                return;
            }

            console.log(`   📝 "${transcript.substring(0, 70)}"`);

            if (!sessionStore[sessionId]) return;

            if (!sessionStore[sessionId].transcripts) {
                sessionStore[sessionId].transcripts = {};
            }
            if (!sessionStore[sessionId].transcripts[slideIndex]) {
                sessionStore[sessionId].transcripts[slideIndex] = '';
            }
            sessionStore[sessionId].transcripts[slideIndex] += transcript + ' ';

            socket.emit('transcript_update', { slideIndex, text: transcript });

            const slideText = sessionStore[sessionId].slideTexts?.[slideIndex] || '';

            // Run metrics tools
            let wpmResult, fillerResult, confidenceResult, alignmentResult;
            try {
                [wpmResult, fillerResult, confidenceResult, alignmentResult] = await Promise.all([
                    wpmTool.invoke(JSON.stringify({ transcript, chunkDurationSeconds: 4, sessionId })),
                    fillerTool.invoke(JSON.stringify({ transcript, sessionId })),
                    confidenceTool.invoke(JSON.stringify({ transcript, sessionId })),
                    alignmentTool.invoke(JSON.stringify({ transcript: sessionStore[sessionId].transcripts[slideIndex], slideText, sessionId })),
                ]);
            } catch (err) {
                console.error('   ❌ Tool error:', err.message);
                return;
            }

            if (!sessionStore[sessionId]) return;

            if (!sessionStore[sessionId].metrics) {
                sessionStore[sessionId].metrics = {};
            }

            const wpm = JSON.parse(wpmResult);
            const fillers = JSON.parse(fillerResult);
            const confidence = JSON.parse(confidenceResult);
            const alignment = JSON.parse(alignmentResult);

            // Store latest metrics per slide for report
            sessionStore[sessionId].metrics[slideIndex] = {
                wpm: wpm.average,
                fillers: fillers.sessionTotal,
                confidence: confidence.score,
                alignmentScore: alignment.alignmentScore,
                verbatimMatchPct: alignment.verbatimMatchPct,
                isReadingSlide: alignment.isReadingSlide,
            };

            console.log(`   📊 WPM: ${wpm.average} | Fillers: ${fillers.sessionTotal} | Conf: ${confidence.score}% | Align: ${alignment.alignmentScore}% (Verbatim: ${alignment.verbatimMatchPct}%)`);

            socket.emit('metrics_update', {
                wpm: wpm.average,
                wpmCurrent: wpm.wpm,
                wpmTrend: wpm.trend,
                wpmLabel: wpm.label,
                fillers: fillers.sessionTotal,
                fillerChunk: fillers.chunkCount,
                fillerBreakdown: fillers.breakdown,
                topFiller: fillers.topFiller,
                confidence: confidence.score,
                confLevel: confidence.level,
                hedgesFound: confidence.hedgesFound,
                suggestion: confidence.suggestion,
                alignmentScore: alignment.alignmentScore,
                verbatimMatchPct: alignment.verbatimMatchPct,
                isReadingSlide: alignment.isReadingSlide,
                alignmentLabel: alignment.label,
                alignmentSuggestion: alignment.suggestion,
                slideIndex,
            });
        });

        // ── slide_change ─────────────────────────────────────────
        socket.on('slide_change', async ({ sessionId, completedSlide, newSlide }) => {
            console.log(`\n📊 Slide change | ${completedSlide} → ${newSlide}`);

            if (sessionStore[sessionId]) {
                sessionStore[sessionId].slideIndex = newSlide;
            }

            const fullTranscript =
                sessionStore[sessionId]?.transcripts[completedSlide] || '';
            const slideText =
                sessionStore[sessionId]?.slideTexts[completedSlide] || '';

            if (!fullTranscript || fullTranscript.trim() === '') {
                socket.emit('coaching_tip', {
                    tip: 'No speech detected on this slide.',
                    slideIndex: completedSlide,
                    loading: false,
                    topIssue: null,
                });
                return;
            }

            socket.emit('coaching_tip', {
                tip: null, slideIndex: completedSlide, loading: true, topIssue: null,
            });

            const result = await runCoachingAgent(
                fullTranscript, completedSlide, sessionId, slideText
            );

            // Store tip for report
            if (sessionStore[sessionId]) {
                sessionStore[sessionId].tips[completedSlide] = result.tip;
                sessionStore[sessionId].topIssues[completedSlide] = result.topIssue;
            }

            console.log(`   💡 "${result.tip}"`);

            socket.emit('coaching_tip', {
                tip: result.tip,
                slideIndex: completedSlide,
                loading: false,
                wpm: result.wpm,
                fillers: result.fillers,
                confidence: result.confidence,
                alignmentScore: result.alignmentScore,
                verbatimMatchPct: result.verbatimMatchPct,
                isReadingSlide: result.isReadingSlide,
                topIssue: result.topIssue,
            });
        });

        // ── end_session ──────────────────────────────────────────
        // PHASE 6: now saves full report to MongoDB
        socket.on('end_session', async ({ sessionId }) => {
            console.log(`\n🏁 Session ended: ${sessionId}`);

            const data = sessionStore[sessionId];
            if (!data) {
                socket.emit('session_ended', { message: 'Session complete', sessionId });
                return;
            }

            try {
                // ── Build per-slide data ──────────────────────────────
                const slides = Object.keys(data.transcripts).map((idx) => {
                    const i = parseInt(idx);
                    const metrics = data.metrics[i] || {
                        wpm: 0, fillers: 0, confidence: 0, alignmentScore: 100, verbatimMatchPct: 0, isReadingSlide: false,
                    };
                    const transcript = data.transcripts[i] || '';
                    const tip = data.tips[i] || '';
                    const topIssue = data.topIssues[i] || '';

                    // Per-slide score: weighted average
                    const wpmScore = metrics.wpm >= 120 && metrics.wpm <= 150 ? 100
                        : metrics.wpm < 100 || metrics.wpm > 170 ? 50 : 70;
                    const confScore = metrics.confidence || 0;
                    const fillScore = metrics.fillers === 0 ? 100
                        : metrics.fillers <= 2 ? 80
                            : metrics.fillers <= 5 ? 60 : 40;
                    const alignScore = metrics.alignmentScore ?? 100;
                    const slideScore = Math.round((wpmScore * 0.25) + (confScore * 0.3) + (fillScore * 0.25) + (alignScore * 0.2));

                    return {
                        index: i,
                        transcript: transcript.trim(),
                        metrics,
                        coachingTip: tip,
                        topIssue,
                        score: slideScore,
                    };
                }).sort((a, b) => a.index - b.index);

                // ── Compute overall report ────────────────────────────
                const slidesWithSpeech = slides.filter(s => s.transcript.length > 0);

                const avgWPM = slidesWithSpeech.length > 0
                    ? Math.round(slidesWithSpeech.reduce((a, s) => a + s.metrics.wpm, 0) / slidesWithSpeech.length)
                    : 0;

                const totalFillers = slidesWithSpeech.reduce((a, s) => a + s.metrics.fillers, 0);

                const avgConfidence = slidesWithSpeech.length > 0
                    ? Math.round(slidesWithSpeech.reduce((a, s) => a + s.metrics.confidence, 0) / slidesWithSpeech.length)
                    : 0;

                const avgAlignment = slidesWithSpeech.length > 0
                    ? Math.round(slidesWithSpeech.reduce((a, s) => a + (s.metrics.alignmentScore || 100), 0) / slidesWithSpeech.length)
                    : 100;

                const slideReaderCount = slidesWithSpeech.filter(s => s.metrics.isReadingSlide).length;

                const overallScore = slidesWithSpeech.length > 0
                    ? Math.round(slidesWithSpeech.reduce((a, s) => a + s.score, 0) / slidesWithSpeech.length)
                    : 0;

                const bestSlide = slides.reduce((best, s) => s.score > best.score ? s : best, slides[0] || { index: 0, score: 0 }).index;
                const worstSlide = slides.reduce((worst, s) => s.score < worst.score ? s : worst, slides[0] || { index: 0, score: 100 }).index;

                const totalWords = slidesWithSpeech.reduce((a, s) => {
                    return a + s.transcript.split(/\s+/).filter(Boolean).length;
                }, 0);

                const durationSeconds = Math.round((Date.now() - data.startTime) / 1000);

                // Top issue overall
                const issueCounts = {};
                slides.forEach(s => {
                    if (s.topIssue) issueCounts[s.topIssue] = (issueCounts[s.topIssue] || 0) + 1;
                });
                const topIssue = Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

                const finalReport = {
                    overallScore,
                    avgWPM,
                    totalFillers,
                    avgConfidence,
                    avgAlignment,
                    slideReaderCount,
                    bestSlide,
                    worstSlide,
                    topIssue,
                    totalWords,
                    durationSeconds,
                };

                // ── Save to MongoDB ───────────────────────────────────
                await Session.findByIdAndUpdate(sessionId, {
                    slides,
                    finalReport,
                    status: 'completed',
                    completedAt: new Date(),
                });

                console.log('💾 Session saved to MongoDB');
                console.log(`   Score: ${overallScore}/100 | WPM: ${avgWPM} | Fillers: ${totalFillers}`);

                // Tell browser where to find the report
                socket.emit('session_ended', {
                    message: 'Session saved',
                    sessionId,
                    report: finalReport,
                    slides,
                });

            } catch (err) {
                console.error('❌ Error saving session:', err.message);
                socket.emit('session_ended', { message: 'Session ended (save failed)', sessionId });
            }

            cleanupSession(sessionId);
            delete sessionStore[sessionId];
        });

        socket.on('disconnect', () => {
            console.log(`❌ Disconnected: ${socket.id}`);
        });
    });
};