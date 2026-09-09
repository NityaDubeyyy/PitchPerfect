// Phase 4: shows accurate WPM, filler breakdown, confidence score

export default function MetricsPanel({ metrics }) {

    // WPM colour coding
    const wpm = metrics?.wpm ?? null;
    const wpmLabel = metrics?.wpmLabel ?? null;
    const wpmColor =
        !wpm ? '#555'
            : wpm < 110 ? '#f87171'  // too slow
                : wpm > 160 ? '#f87171'  // too fast
                    : wpm < 120 ? '#facc15'  // slightly slow
                        : wpm > 150 ? '#facc15'  // slightly fast
                            : '#4ade80';               // perfect

    // Filler data
    const fillerTotal = metrics?.fillers ?? null;
    const fillerBreakdown = metrics?.fillerBreakdown ?? {};
    const topFiller = metrics?.topFiller ?? null;
    const fillerColor =
        !fillerTotal ? '#555'
            : fillerTotal === 0 ? '#4ade80'
                : fillerTotal <= 3 ? '#facc15'
                    : '#f87171';

    // Confidence data
    const confidence = metrics?.confidence ?? null;
    const confLevel = metrics?.confLevel ?? null;
    const suggestion = metrics?.suggestion ?? null;
    const confColor =
        !confidence ? '#555'
            : confidence >= 88 ? '#4ade80'
                : confidence >= 75 ? '#facc15'
                    : '#f87171';

    // Slide Alignment data
    const alignmentScore = metrics?.alignmentScore ?? null;
    const verbatimMatchPct = metrics?.verbatimMatchPct ?? 0;
    const isReadingSlide = metrics?.isReadingSlide ?? false;
    const alignmentSuggestion = metrics?.alignmentSuggestion ?? null;
    const alignColor =
        !alignmentScore ? '#555'
            : isReadingSlide ? '#c084fc'
                : alignmentScore >= 75 ? '#4ade80'
                    : alignmentScore >= 60 ? '#facc15'
                        : '#f87171';

    return (
        <div style={s.panel}>
            <div style={s.heading}>Live metrics</div>

            {/* ── WPM ────────────────────────────────────── */}
            <div style={s.metricBlock}>
                <div style={s.row}>
                    <span style={s.label}>Speed</span>
                    <span style={{ ...s.value, color: wpmColor }}>
                        {wpm ? `${wpm} wpm` : '--'}
                    </span>
                </div>
                {wpm && (
                    <>
                        <div style={s.barTrack}>
                            <div style={{
                                ...s.barFill,
                                width: `${Math.min((wpm / 200) * 100, 100)}%`,
                                background: wpmColor,
                            }} />
                            {/* ideal zone marker */}
                            <div style={s.idealZone} />
                        </div>
                        <div style={s.subText}>
                            {metrics?.wpmTrend !== 'stable' && (
                                <span style={{ color: '#facc15' }}>
                                    {metrics.wpmTrend === 'speeding up' ? '↑ speeding up' : '↓ slowing down'}
                                </span>
                            )}
                            {wpmLabel && wpmLabel !== 'good' && (
                                <span style={{ color: wpmColor, marginLeft: '6px' }}>
                                    {wpmLabel}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ── Fillers ────────────────────────────────── */}
            <div style={s.metricBlock}>
                <div style={s.row}>
                    <span style={s.label}>Filler words</span>
                    <span style={{ ...s.value, color: fillerColor }}>
                        {fillerTotal !== null ? `${fillerTotal} total` : '--'}
                    </span>
                </div>
                {/* Filler breakdown chips */}
                {Object.keys(fillerBreakdown).length > 0 && (
                    <div style={s.chipRow}>
                        {Object.entries(fillerBreakdown)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 4)
                            .map(([word, count]) => (
                                <span key={word} style={s.chip}>
                                    {word} ×{count}
                                </span>
                            ))}
                    </div>
                )}
                {topFiller && (
                    <div style={{ ...s.subText, color: '#f87171' }}>
                        Most common: "{topFiller}"
                    </div>
                )}
            </div>

            {/* ── Confidence ─────────────────────────────── */}
            <div style={s.metricBlock}>
                <div style={s.row}>
                    <span style={s.label}>Confidence</span>
                    <span style={{ ...s.value, color: confColor }}>
                        {confidence !== null ? `${confidence}%` : '--'}
                    </span>
                </div>
                {confidence !== null && (
                    <div style={s.barTrack}>
                        <div style={{
                            ...s.barFill,
                            width: `${confidence}%`,
                            background: confColor,
                        }} />
                    </div>
                )}
                {suggestion && (
                    <div style={{ ...s.subText, color: '#facc15', marginTop: '4px' }}>
                        💡 {suggestion}
                    </div>
                )}
            </div>

            {/* ── Slide Alignment & Slide Reader ─────────── */}
            <div style={s.metricBlock}>
                <div style={s.row}>
                    <span style={s.label}>Slide Alignment</span>
                    <span style={{ ...s.value, color: alignColor }}>
                        {alignmentScore !== null ? `${alignmentScore}%` : '--'}
                    </span>
                </div>
                {alignmentScore !== null && (
                    <div style={s.barTrack}>
                        <div style={{
                            ...s.barFill,
                            width: `${alignmentScore}%`,
                            background: alignColor,
                        }} />
                    </div>
                )}
                {isReadingSlide && (
                    <div style={{ ...s.chip, background: '#3b0764', color: '#c084fc', border: '0.5px solid #6b21a8', marginTop: '4px', alignSelf: 'flex-start' }}>
                        📖 Slide Reader Warning ({verbatimMatchPct}% verbatim)
                    </div>
                )}
                {alignmentSuggestion && !isReadingSlide && (
                    <div style={{ ...s.subText, color: '#c084fc', marginTop: '2px' }}>
                        🎯 {alignmentSuggestion}
                    </div>
                )}
            </div>

            {!metrics && (
                <div style={s.hint}>
                    Metrics appear once mic is active and you speak
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
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    heading: {
        fontSize: '11px',
        fontWeight: '500',
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: '#555',
    },
    metricBlock: {
        background: '#111115',
        borderRadius: '8px',
        border: '1px solid #2a2a30',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    row: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: { fontSize: '12px', color: '#666' },
    value: { fontSize: '13px', fontWeight: '500' },
    barTrack: {
        height: '4px',
        background: '#2a2a30',
        borderRadius: '2px',
        overflow: 'hidden',
        position: 'relative',
    },
    barFill: {
        height: '100%',
        borderRadius: '2px',
        transition: 'width 0.5s ease',
    },
    idealZone: {
        position: 'absolute',
        top: 0,
        left: '60%',
        width: '15%',
        height: '100%',
        background: 'rgba(74,222,128,0.2)',
    },
    chipRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        marginTop: '2px',
    },
    chip: {
        fontSize: '10px',
        padding: '2px 7px',
        borderRadius: '999px',
        background: '#2a1515',
        color: '#f87171',
        border: '0.5px solid #5a2020',
    },
    subText: {
        fontSize: '11px',
        color: '#555',
        lineHeight: '1.4',
    },
    hint: {
        fontSize: '11px',
        color: '#333',
        textAlign: 'center',
        fontStyle: 'italic',
        padding: '8px 0',
    },
};