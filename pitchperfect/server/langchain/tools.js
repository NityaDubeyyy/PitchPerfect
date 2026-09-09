// server/langchain/tools.js
//
// Three LangChain Tool objects used in Phase 4 for metrics
// and reused in Phase 5 by the ReAct coaching agent.

const { DynamicTool } = require('@langchain/core/tools');

// ── Rolling WPM store ─────────────────────────────────────
const wpmHistory = {};

// ── Session filler totals ─────────────────────────────────
const fillerTotals = {};

// ── Session hedge totals ──────────────────────────────────
const hedgeTotals = {};

// ─────────────────────────────────────────────────────────
// TOOL 1: WPM Calculator
// ─────────────────────────────────────────────────────────
const wpmTool = new DynamicTool({
  name: 'wpm_calculator',
  description: `Calculates accurate words per minute from a speech transcript chunk.
    Input: JSON with transcript (string), chunkDurationSeconds (number), sessionId (string).
    Output: JSON with wpm (number), average (number), trend (string), label (string).`,

  func: async (inputStr) => {
    try {
      const { transcript, chunkDurationSeconds = 3, sessionId } = JSON.parse(inputStr);

      const words = transcript.trim().split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const wpm = Math.round((wordCount / chunkDurationSeconds) * 60);

      if (!wpmHistory[sessionId]) wpmHistory[sessionId] = [];
      wpmHistory[sessionId].push(wpm);
      if (wpmHistory[sessionId].length > 5) wpmHistory[sessionId].shift();

      const average = Math.round(
        wpmHistory[sessionId].reduce((a, b) => a + b, 0) /
        wpmHistory[sessionId].length
      );

      const history = wpmHistory[sessionId];
      let trend = 'stable';
      if (history.length >= 3) {
        const recent = history.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const older  = history.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(history.length - 3, 1);
        if (recent > older + 10) trend = 'speeding up';
        if (recent < older - 10) trend = 'slowing down';
      }

      let label = 'good';
      if (average < 100)      label = 'too slow';
      else if (average < 120) label = 'slightly slow';
      else if (average > 160) label = 'too fast';
      else if (average > 150) label = 'slightly fast';

      return JSON.stringify({ wpm, average, trend, label });
    } catch (err) {
      return JSON.stringify({ wpm: 0, average: 0, trend: 'stable', label: 'error', error: err.message });
    }
  },
});

// ─────────────────────────────────────────────────────────
// TOOL 2: Filler Word Detector
// ─────────────────────────────────────────────────────────
const fillerTool = new DynamicTool({
  name: 'filler_detector',
  description: `Detects filler words in a speech transcript.
    Input: JSON with transcript (string), sessionId (string).
    Output: JSON with chunkCount, sessionTotal, breakdown object, topFiller string.`,

  func: async (inputStr) => {
    try {
      const { transcript, sessionId } = JSON.parse(inputStr);

      const FILLER_PATTERNS = [
        ['um',        /\bum+\b/gi],
        ['uh',        /\buh+\b/gi],
        ['like',      /\blike\b/gi],
        ['basically', /\bbasically\b/gi],
        ['you know',  /\byou know\b/gi],
        ['so',        /\bso\b/gi],
        ['actually',  /\bactually\b/gi],
        ['right',     /\bright\b/gi],
        ['okay',      /\bokay\b/gi],
        ['hmm',       /\bhmm+\b/gi],
        ['literally', /\bliterally\b/gi],
        ['kind of',   /\bkind of\b/gi],
        ['sort of',   /\bsort of\b/gi],
      ];

      const chunkBreakdown = {};
      let chunkCount = 0;

      for (const [name, regex] of FILLER_PATTERNS) {
        const matches = transcript.match(regex);
        if (matches && matches.length > 0) {
          chunkBreakdown[name] = matches.length;
          chunkCount += matches.length;
        }
      }

      if (!fillerTotals[sessionId]) fillerTotals[sessionId] = {};
      for (const [word, count] of Object.entries(chunkBreakdown)) {
        fillerTotals[sessionId][word] = (fillerTotals[sessionId][word] || 0) + count;
      }

      const sessionTotal = Object.values(fillerTotals[sessionId]).reduce((a, b) => a + b, 0);
      const topFiller = Object.entries(fillerTotals[sessionId]).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      return JSON.stringify({
        chunkCount,
        sessionTotal,
        breakdown: fillerTotals[sessionId],
        topFiller,
      });
    } catch (err) {
      return JSON.stringify({ chunkCount: 0, sessionTotal: 0, breakdown: {}, topFiller: null, error: err.message });
    }
  },
});

// ─────────────────────────────────────────────────────────
// TOOL 3: Confidence Scorer
// ─────────────────────────────────────────────────────────
const confidenceTool = new DynamicTool({
  name: 'confidence_scorer',
  description: `Scores speaker confidence by detecting hedging phrases.
    Input: JSON with transcript (string), sessionId (string).
    Output: JSON with score (0-100), level (string), hedgesFound (array), suggestion (string).`,

  func: async (inputStr) => {
    try {
      const { transcript, sessionId } = JSON.parse(inputStr);

      const HEDGE_PHRASES = [
        'i think', 'i believe', 'i guess', 'maybe', 'perhaps', 'probably',
        'not sure', "i'm not sure", 'kind of', 'sort of', 'basically',
        'i mean', 'you know', 'like i said', 'if that makes sense',
        'does that make sense', 'something like that', 'and stuff', 'et cetera',
      ];

      const lower = transcript.toLowerCase();
      const hedgesFound = [];

      for (const phrase of HEDGE_PHRASES) {
        const regex   = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        const matches = lower.match(regex);
        if (matches) hedgesFound.push({ phrase, count: matches.length });
      }

      if (!hedgeTotals[sessionId]) hedgeTotals[sessionId] = {};
      for (const { phrase, count } of hedgesFound) {
        hedgeTotals[sessionId][phrase] = (hedgeTotals[sessionId][phrase] || 0) + count;
      }

      const wordCount   = transcript.trim().split(/\s+/).filter(Boolean).length;
      const totalHedges = hedgesFound.reduce((a, b) => a + b.count, 0);
      const hedgeRate   = wordCount > 0 ? totalHedges / wordCount : 0;
      const penalty     = Math.min(hedgeRate * 300, 50);
      const score       = Math.round(Math.max(100 - penalty, 40));

      let level = 'confident';
      if (score < 60)      level = 'hesitant';
      else if (score < 75) level = 'uncertain';
      else if (score < 88) level = 'moderate';

      let suggestion = null;
      if (hedgesFound.length > 0) {
        const worst = hedgesFound.sort((a, b) => b.count - a.count)[0];
        const suggestions = {
          'i think':   'Say it directly — drop "I think" and state it as fact',
          'maybe':     'Replace "maybe" with a specific recommendation',
          'basically': 'Drop "basically" — it weakens your point',
          'kind of':   'Be specific — replace "kind of" with exact description',
          'you know':  'Remove "you know" — your audience is listening closely',
          'i guess':   'Replace "I guess" with "In my view" or just state it',
          'i mean':    'Drop "I mean" — say what you mean directly',
          'probably':  'Replace "probably" with data or a confident estimate',
        };
        suggestion = suggestions[worst.phrase] ||
          `Try removing "${worst.phrase}" — it signals uncertainty`;
      }

      return JSON.stringify({
        score,
        level,
        hedgesFound: hedgesFound.slice(0, 3),
        suggestion,
        sessionHedges: hedgeTotals[sessionId],
      });
    } catch (err) {
      return JSON.stringify({ score: 100, level: 'confident', hedgesFound: [], suggestion: null });
    }
  },
});

// ─────────────────────────────────────────────────────────
// TOOL 4: Slide Content & Semantic Alignment Detector
// ─────────────────────────────────────────────────────────
const alignmentTool = new DynamicTool({
  name: 'alignment_detector',
  description: `Detects semantic alignment between speech transcript and current slide text, flagging verbatim slide reading.
    Input: JSON with transcript (string), slideText (string), sessionId (string).
    Output: JSON with alignmentScore (number), verbatimMatchPct (number), isReadingSlide (boolean), label (string), suggestion (string).`,

  func: async (inputStr) => {
    try {
      const { transcript = '', slideText = '' } = JSON.parse(inputStr);

      const cleanSpoken = transcript.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
      const cleanSlide = slideText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);

      if (cleanSpoken.length === 0 || cleanSlide.length === 0) {
        return JSON.stringify({
          alignmentScore: 80,
          verbatimMatchPct: 0,
          isReadingSlide: false,
          label: 'insufficient data',
          suggestion: 'Speak more on this slide to assess alignment.',
        });
      }

      // Stopwords list to extract meaningful slide keywords
      const STOPWORDS = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'this', 'that',
        'these', 'those', 'it', 'its', 'you', 'your', 'we', 'our', 'i', 'my', 'as', 'can', 'will',
      ]);

      const slideKeywords = cleanSlide.filter(w => !STOPWORDS.has(w) && w.length > 2);
      const uniqueSlideKeywords = [...new Set(slideKeywords)];

      // 1. Verbatim n-gram overlap check (3-grams)
      let matchedTrigrams = 0;
      let totalTrigrams = 0;

      if (cleanSpoken.length >= 3) {
        const slideTextStr = cleanSlide.join(' ');
        for (let i = 0; i <= cleanSpoken.length - 3; i++) {
          totalTrigrams++;
          const trigram = cleanSpoken.slice(i, i + 3).join(' ');
          if (slideTextStr.includes(trigram)) {
            matchedTrigrams++;
          }
        }
      }

      const verbatimMatchPct = totalTrigrams > 0
        ? Math.min(Math.round((matchedTrigrams / totalTrigrams) * 100), 100)
        : 0;

      const isReadingSlide = verbatimMatchPct >= 45;

      // 2. Keyword coverage
      const spokenSet = new Set(cleanSpoken);
      let matchedKeywords = 0;
      for (const kw of uniqueSlideKeywords) {
        if (spokenSet.has(kw)) matchedKeywords++;
      }

      const keywordCoverage = uniqueSlideKeywords.length > 0
        ? matchedKeywords / uniqueSlideKeywords.length
        : 1;

      // 3. Compute Alignment Score (0-100)
      let alignmentScore = 85;

      if (isReadingSlide) {
        // Penalty for reading verbatim off the slide
        alignmentScore = Math.max(100 - Math.round(verbatimMatchPct * 1.1), 35);
      } else {
        // Reward adding value & covering slide points without reading word-for-word
        alignmentScore = Math.round(50 + (keywordCoverage * 45));
        if (verbatimMatchPct <= 20) alignmentScore = Math.min(alignmentScore + 10, 100);
      }

      let label = 'good';
      let suggestion = null;

      if (isReadingSlide) {
        label = 'verbatim reading';
        suggestion = `You are reading ${verbatimMatchPct}% of your slide text verbatim. Elaborate with your own narrative instead of reading bullet points.`;
      } else if (alignmentScore < 60) {
        label = 'low alignment';
        suggestion = 'Your speech doesn\'t cover the key points listed on this slide. Connect your talk to the visual content.';
      } else {
        label = 'well delivered';
      }

      return JSON.stringify({
        alignmentScore,
        verbatimMatchPct,
        isReadingSlide,
        label,
        suggestion,
      });
    } catch (err) {
      return JSON.stringify({
        alignmentScore: 80,
        verbatimMatchPct: 0,
        isReadingSlide: false,
        label: 'error',
        suggestion: null,
      });
    }
  },
});

// ─────────────────────────────────────────────────────────
// Cleanup function — call when session ends
// ─────────────────────────────────────────────────────────
function cleanupSession(sessionId) {
  delete wpmHistory[sessionId];
  delete fillerTotals[sessionId];
  delete hedgeTotals[sessionId];
}

module.exports = { wpmTool, fillerTool, confidenceTool, alignmentTool, cleanupSession };

