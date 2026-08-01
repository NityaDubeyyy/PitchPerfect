// client/src/components/CoachPanel.jsx  (Phase 5)

export default function CoachPanel({ tip, slideIndex, loading, topIssue }) {

    const issueColor = {
        pace: '#facc15',
        fillers: '#f87171',
        confidence: '#c084fc',
        clarity: '#60a5fa',
    }[topIssue] || '#4ade80';

    const issueLabel = {
        pace: '⚡ Pace',
        fillers: '🚫 Fillers',
        confidence: '💪 Confidence',
        clarity: '📋 Clarity',
    }[topIssue] || '💡 Coaching tip';

    return (
        <div style={s.panel}>
            <div style={s.heading}>AI Coach</div>

            {/* Loading — agent is reasoning */}
            {loading && (
                <div style={s.loadingBox}>
                    <div style={s.spinner} />
                    <div style={s.loadingText}>
                        Analysing slide {slideIndex + 1}...
                    </div>
                </div>
            )}

            {/* Real AI tip */}
            {!loading && tip && (
                <div style={{ ...s.tipBox, borderColor: issueColor + '44' }}>
                    <div style={{ ...s.tipLabel, color: issueColor }}>
                        {issueLabel} — slide {slideIndex + 1}
                    </div>
                    <div style={s.tipText}>{tip}</div>
                </div>
            )}

            {/* Placeholder */}
            {!loading && !tip && (
                <div style={s.placeholder}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>🤖</div>
                    <div style={s.phTitle}>Your AI coach is ready</div>
                    <div style={s.phText}>
                        Speak on a slide, then click Next — your coach will analyse your delivery and give you one specific improvement tip.
                    </div>
                </div>
            )}
        </div>
    );
}

const s = {
    panel: {
        background: '#1a1a1f',
        border: '1px solid #2a2a30',
        borderRadius: '10px',
        padding: '1rem',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: '180px',
    },
    heading: {
        fontSize: '11px',
        fontWeight: '500',
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: '#555',
    },
    loadingBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px',
        background: '#111115',
        borderRadius: '8px',
        border: '1px solid #2a2a30',
        flex: 1,
    },
    spinner: {
        width: '16px',
        height: '16px',
        border: '2px solid #2a2a30',
        borderTop: '2px solid #7c6fe0',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        flexShrink: 0,
    },
    loadingText: {
        fontSize: '12px',
        color: '#555',
        fontStyle: 'italic',
    },
    tipBox: {
        background: '#111115',
        border: '1px solid #2a4a2a',
        borderRadius: '8px',
        padding: '12px',
    },
    tipLabel: {
        fontSize: '10px',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: '.04em',
        marginBottom: '8px',
    },
    tipText: {
        fontSize: '13px',
        color: '#e2e8f0',
        lineHeight: '1.7',
    },
    placeholder: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        textAlign: 'center',
        flex: 1,
    },
    phTitle: {
        fontSize: '13px',
        fontWeight: '500',
        color: '#555',
        marginBottom: '8px',
    },
    phText: {
        fontSize: '12px',
        color: '#333',
        lineHeight: '1.6',
    },
};