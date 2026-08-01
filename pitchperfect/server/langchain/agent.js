// server/langchain/agent.js

const { wpmTool, fillerTool, confidenceTool } = require('./tools');

let ChatOpenAI;
try {
    ChatOpenAI = require('@langchain/openai').ChatOpenAI;
} catch (e) {
    try {
        ChatOpenAI = require('langchain/chat_models/openai').ChatOpenAI;
    } catch (e2) {
        ChatOpenAI = null;
    }
}

/**
 * Runs the coaching agent on a slide's transcript and returns feedback metrics + tip.
 *
 * @param {string} fullTranscript - Complete transcript spoken during the slide
 * @param {number} slideIndex - Zero-indexed slide number
 * @param {string} sessionId - Session ID for tracking rolling metrics
 * @param {string} slideNotes - Optional speaker notes for context
 * @returns {Promise<{tip: string, topIssue: string|null, wpm: number, fillers: number, confidence: number}>}
 */
async function runCoachingAgent(fullTranscript, slideIndex, sessionId, slideNotes = '') {
    if (!fullTranscript || fullTranscript.trim() === '') {
        return {
            tip: 'No speech detected on this slide.',
            topIssue: null,
            wpm: 0,
            fillers: 0,
            confidence: 100,
        };
    }

    const words = fullTranscript.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const estimatedDuration = Math.max(Math.round(wordCount / 2.5), 5);

    let wpmData = { wpm: 0, average: 130, label: 'good' };
    let fillerData = { sessionTotal: 0, chunkCount: 0, topFiller: null };
    let confidenceData = { score: 100, level: 'confident', hedgesFound: [] };

    try {
        const [wpmRes, fillerRes, confRes] = await Promise.all([
            wpmTool.invoke(JSON.stringify({ transcript: fullTranscript, chunkDurationSeconds: estimatedDuration, sessionId })),
            fillerTool.invoke(JSON.stringify({ transcript: fullTranscript, sessionId })),
            confidenceTool.invoke(JSON.stringify({ transcript: fullTranscript, sessionId })),
        ]);
        wpmData = JSON.parse(wpmRes);
        fillerData = JSON.parse(fillerRes);
        confidenceData = JSON.parse(confRes);
    } catch (err) {
        console.error('Agent tool evaluation error:', err.message);
    }

    const wpm = wpmData.average || wpmData.wpm || 130;
    const fillers = fillerData.sessionTotal || fillerData.chunkCount || 0;
    const confidence = confidenceData.score ?? 100;

    // Determine top issue
    let topIssue = null;
    if (fillerData.chunkCount > 0 || fillers > 2) {
        topIssue = 'fillers';
    } else if (wpmData.label === 'too fast' || wpmData.label === 'slightly fast' || wpmData.label === 'too slow') {
        topIssue = 'pace';
    } else if (confidence < 80 || confidenceData.hedgesFound?.length > 0) {
        topIssue = 'confidence';
    } else {
        topIssue = 'clarity';
    }

    let tip = null;

    // Try OpenAI if API key present
    if (process.env.OPENAI_API_KEY && ChatOpenAI) {
        try {
            const llm = new ChatOpenAI({
                modelName: 'gpt-4o-mini',
                temperature: 0.7,
                openAIApiKey: process.env.OPENAI_API_KEY,
            });

            const prompt = `You are PitchPerfect, an elite executive speech coach.
Analyse this presentation slide delivery transcript and metrics:
- Slide Number: ${slideIndex + 1}
- Transcript: "${fullTranscript}"
- Words Per Minute: ${wpm} (${wpmData.label})
- Filler Words Count: ${fillerData.chunkCount} (Top filler: ${fillerData.topFiller || 'none'})
- Confidence Score: ${confidence}% (${confidenceData.level})
- Primary Issue Focus: ${topIssue}

Provide ONE concise, high-impact coaching tip (maximum 2 sentences). Be encouragement-focused yet specific and actionable.`;

            const response = await llm.invoke(prompt);
            if (response && response.content) {
                tip = typeof response.content === 'string' ? response.content.trim() : JSON.stringify(response.content);
            }
        } catch (llmErr) {
            console.warn('⚠️ OpenAI LLM call failed or skipped, using heuristic coach:', llmErr.message);
        }
    }

    // Heuristic fallback if LLM is unavailable or failed
    if (!tip) {
        if (topIssue === 'fillers') {
            const topF = fillerData.topFiller ? `"${fillerData.topFiller}"` : 'filler words';
            tip = `Watch out for using ${topF}. Pause briefly instead of filling space with sound when transitioning thoughts.`;
        } else if (topIssue === 'pace') {
            if (wpm > 150) {
                tip = `Your pace is slightly fast (${wpm} WPM). Slow down at key transitions to let important points sink in.`;
            } else {
                tip = `Your pace is on the slower side (${wpm} WPM). Pick up energy to keep your audience engaged.`;
            }
        } else if (topIssue === 'confidence') {
            if (confidenceData.suggestion) {
                tip = confidenceData.suggestion;
            } else {
                tip = `Avoid hedging language. State your conclusions directly to project maximum authority.`;
            }
        } else {
            tip = `Great delivery on slide ${slideIndex + 1}! Maintain this steady rhythm and clear articulation.`;
        }
    }

    return {
        tip,
        topIssue,
        wpm,
        fillers,
        confidence,
    };
}

module.exports = {
    runCoachingAgent,
};
