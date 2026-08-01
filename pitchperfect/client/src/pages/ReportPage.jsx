import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { getSessionReport } from '../api/sessions';

export default function ReportPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeSlide, setActiveSlide] = useState(null);

    useEffect(() => {
        getSessionReport(id)
            .then(data => { setReport(data); setLoading(false); })
            .catch(err => {
                setError(err.response?.data?.error || 'Could not load report');
                setLoading(false);
            });
    }, [id]);

    if (loading) return (
        <div style={s.center}>
            <div style={s.spinner} />
            <p style={{ color: '#666', marginTop: '12px' }}>Loading your report...</p>
        </div>
    );

    if (error) return (
        <div style={s.center}>
            <p style={{ color: '#f87171' }}>{error}</p>
            <button onClick={() => navigate('/')} style={s.btn}>← Back to home</button>
        </div>
    );

    const { finalReport, slides, title } = report;

    // Prepare chart data
    const chartData = slides.map((slide, i) => ({
        name: `Slide ${slide.index + 1}`,
        wpm: slide.metrics.wpm || 0,
        fillers: slide.metrics.fillers || 0,
        confidence: slide.metrics.confidence || 0,
        score: slide.score || 0,
    }));

    // Score colour
    const scoreColor = finalReport.overallScore >= 80 ? '#4ade80'
        : finalReport.overallScore >= 60 ? '#facc15'
            : '#f87171';

    const scoreLabel = finalReport.overallScore >= 80 ? 'Excellent'
        : finalReport.overallScore >= 60 ? 'Good'
            : 'Needs work';

    return (
        <div style={s.page}>

            {/* Header */}
            <div style={s.header}>
                <button onClick={() => navigate('/')} style={s.backBtn}>← New session</button>
                <div>
                    <div style={s.headerTitle}>📊 Session Report</div>
                    <div style={s.headerSub}>{title}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#555' }}>
                    {slides.length} slides · {Math.round(finalReport.durationSeconds / 60)}m {finalReport.durationSeconds % 60}s
                </div>
            </div>

            <div style={s.body}>

                {/* ── Overall score ───────────────────────────────── */}
                <div style={s.scoreRow}>
                    <div style={{ ...s.scoreCircle, borderColor: scoreColor }}>
                        <div style={{ ...s.scoreNum, color: scoreColor }}>
                            {finalReport.overallScore}
                        </div>
                        <div style={s.scoreLabel}>{scoreLabel}</div>
                    </div>

                    <div style={s.statsGrid}>
                        <div style={s.statBox}>
                            <div style={s.statNum}>{finalReport.avgWPM}</div>
                            <div style={s.statLabel}>Avg WPM</div>
                            <div style={{ ...s.statSub, color: finalReport.avgWPM >= 120 && finalReport.avgWPM <= 150 ? '#4ade80' : '#facc15' }}>
                                {finalReport.avgWPM >= 120 && finalReport.avgWPM <= 150 ? '✓ ideal' : 'adjust pace'}
                            </div>
                        </div>
                        <div style={s.statBox}>
                            <div style={{ ...s.statNum, color: finalReport.totalFillers <= 5 ? '#4ade80' : '#f87171' }}>
                                {finalReport.totalFillers}
                            </div>
                            <div style={s.statLabel}>Total fillers</div>
                            <div style={s.statSub}>
                                {finalReport.totalFillers === 0 ? '✓ clean' : finalReport.totalFillers <= 5 ? 'acceptable' : 'reduce these'}
                            </div>
                        </div>
                        <div style={s.statBox}>
                            <div style={{ ...s.statNum, color: finalReport.avgConfidence >= 80 ? '#4ade80' : '#facc15' }}>
                                {finalReport.avgConfidence}%
                            </div>
                            <div style={s.statLabel}>Avg confidence</div>
                            <div style={s.statSub}>
                                {finalReport.avgConfidence >= 85 ? '✓ confident' : 'speak more directly'}
                            </div>
                        </div>
                        <div style={s.statBox}>
                            <div style={s.statNum}>{finalReport.totalWords}</div>
                            <div style={s.statLabel}>Total words</div>
                            <div style={s.statSub}>across all slides</div>
                        </div>
                    </div>
                </div>

                {/* ── Best and worst slide ─────────────────────────── */}
                <div style={s.bwRow}>
                    <div style={{ ...s.bwBox, borderColor: '#2a4a2a' }}>
                        <div style={{ ...s.bwLabel, color: '#4ade80' }}>🏆 Best slide</div>
                        <div style={s.bwNum}>Slide {finalReport.bestSlide + 1}</div>
                        <div style={s.bwSub}>
                            {slides[finalReport.bestSlide]?.coachingTip?.substring(0, 80) || 'Great delivery'}...
                        </div>
                    </div>
                    <div style={{ ...s.bwBox, borderColor: '#4a2a2a' }}>
                        <div style={{ ...s.bwLabel, color: '#f87171' }}>📈 Most to improve</div>
                        <div style={s.bwNum}>Slide {finalReport.worstSlide + 1}</div>
                        <div style={s.bwSub}>
                            {slides[finalReport.worstSlide]?.coachingTip?.substring(0, 80) || 'Needs attention'}...
                        </div>
                    </div>
                </div>

                {/* ── Charts ──────────────────────────────────────── */}
                <div style={s.chartsRow}>

                    {/* Pace trend */}
                    <div style={s.chartBox}>
                        <div style={s.chartTitle}>Speaking pace per slide (WPM)</div>
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" />
                                <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#555', fontSize: 11 }} domain={[0, 200]} />
                                <Tooltip
                                    contentStyle={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: '8px' }}
                                    labelStyle={{ color: '#ccc' }}
                                    itemStyle={{ color: '#7c6fe0' }}
                                />
                                <ReferenceLine y={120} stroke="#4ade8044" strokeDasharray="4 4" label={{ value: 'min ideal', fill: '#4ade8066', fontSize: 10 }} />
                                <ReferenceLine y={150} stroke="#4ade8044" strokeDasharray="4 4" label={{ value: 'max ideal', fill: '#4ade8066', fontSize: 10 }} />
                                <Line type="monotone" dataKey="wpm" stroke="#7c6fe0" strokeWidth={2} dot={{ fill: '#7c6fe0', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Filler words */}
                    <div style={s.chartBox}>
                        <div style={s.chartTitle}>Filler words per slide</div>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" />
                                <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#555', fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: '8px' }}
                                    labelStyle={{ color: '#ccc' }}
                                    itemStyle={{ color: '#f87171' }}
                                />
                                <Bar dataKey="fillers" fill="#f87171" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Confidence */}
                    <div style={s.chartBox}>
                        <div style={s.chartTitle}>Confidence score per slide</div>
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" />
                                <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#555', fontSize: 11 }} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: '8px' }}
                                    labelStyle={{ color: '#ccc' }}
                                    itemStyle={{ color: '#4ade80' }}
                                />
                                <ReferenceLine y={80} stroke="#4ade8044" strokeDasharray="4 4" />
                                <Line type="monotone" dataKey="confidence" stroke="#4ade80" strokeWidth={2} dot={{ fill: '#4ade80', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                </div>

                {/* ── Slide-by-slide breakdown ─────────────────────── */}
                <div style={s.breakdownTitle}>Slide-by-slide breakdown</div>
                <div style={s.slideList}>
                    {slides.map((slide, i) => (
                        <div
                            key={i}
                            style={{
                                ...s.slideCard,
                                borderColor: activeSlide === i ? '#7c6fe0' : '#2a2a30',
                            }}
                            onClick={() => setActiveSlide(activeSlide === i ? null : i)}
                        >
                            <div style={s.slideCardTop}>
                                <div style={s.slideCardLeft}>
                                    <div style={s.slideNum}>Slide {slide.index + 1}</div>
                                    <div style={s.slideMini}>
                                        <span style={{ color: '#7c6fe0' }}>{slide.metrics.wpm} wpm</span>
                                        <span style={{ color: '#555', margin: '0 6px' }}>·</span>
                                        <span style={{ color: '#f87171' }}>{slide.metrics.fillers} fillers</span>
                                        <span style={{ color: '#555', margin: '0 6px' }}>·</span>
                                        <span style={{ color: '#4ade80' }}>{slide.metrics.confidence}% conf</span>
                                    </div>
                                </div>
                                <div style={{
                                    ...s.slideScore,
                                    color: slide.score >= 80 ? '#4ade80' : slide.score >= 60 ? '#facc15' : '#f87171',
                                }}>
                                    {slide.score}/100
                                </div>
                            </div>

                            {/* Expanded view */}
                            {activeSlide === i && (
                                <div style={s.slideExpanded}>
                                    {slide.coachingTip && (
                                        <div style={s.tipBlock}>
                                            <div style={s.tipBlockLabel}>💡 AI coaching tip</div>
                                            <div style={s.tipBlockText}>{slide.coachingTip}</div>
                                        </div>
                                    )}
                                    {slide.transcript && (
                                        <div style={s.transcriptBlock}>
                                            <div style={s.transcriptLabel}>📝 What you said</div>
                                            <div style={s.transcriptText}>{slide.transcript}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}

const s = {
    page: { minHeight: '100vh', background: '#0f0f11', fontFamily: '-apple-system,sans-serif', color: '#fff' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem 1.5rem', borderBottom: '1px solid #2a2a30', background: '#1a1a1f' },
    headerTitle: { fontSize: '15px', fontWeight: '500', color: '#fff' },
    headerSub: { fontSize: '12px', color: '#555', marginTop: '2px' },
    backBtn: { background: 'transparent', border: '1px solid #2a2a30', borderRadius: '6px', color: '#666', padding: '5px 12px', fontSize: '13px', cursor: 'pointer' },
    body: { padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' },

    scoreRow: { display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' },
    scoreCircle: { width: '120px', height: '120px', borderRadius: '50%', border: '4px solid', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    scoreNum: { fontSize: '32px', fontWeight: '600' },
    scoreLabel: { fontSize: '12px', color: '#555', marginTop: '2px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', flex: 1, minWidth: '280px' },
    statBox: { background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: '10px', padding: '12px', textAlign: 'center' },
    statNum: { fontSize: '22px', fontWeight: '500', color: '#fff', marginBottom: '4px' },
    statLabel: { fontSize: '11px', color: '#555', marginBottom: '2px' },
    statSub: { fontSize: '10px', color: '#444' },

    bwRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.5rem' },
    bwBox: { background: '#1a1a1f', border: '1px solid', borderRadius: '10px', padding: '1rem' },
    bwLabel: { fontSize: '11px', fontWeight: '500', marginBottom: '4px' },
    bwNum: { fontSize: '16px', fontWeight: '500', color: '#fff', marginBottom: '4px' },
    bwSub: { fontSize: '12px', color: '#555', lineHeight: '1.5' },

    chartsRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '1.5rem' },
    chartBox: { background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: '10px', padding: '1rem' },
    chartTitle: { fontSize: '11px', fontWeight: '500', color: '#555', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '.04em' },

    breakdownTitle: { fontSize: '13px', fontWeight: '500', color: '#555', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '10px' },
    slideList: { display: 'flex', flexDirection: 'column', gap: '8px' },
    slideCard: { background: '#1a1a1f', border: '1px solid', borderRadius: '10px', padding: '1rem', cursor: 'pointer', transition: 'border-color .15s' },
    slideCardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    slideCardLeft: { flex: 1 },
    slideNum: { fontSize: '13px', fontWeight: '500', color: '#fff', marginBottom: '3px' },
    slideMini: { fontSize: '12px' },
    slideScore: { fontSize: '16px', fontWeight: '500' },
    slideExpanded: { marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #2a2a30', display: 'flex', flexDirection: 'column', gap: '10px' },
    tipBlock: { background: '#111115', border: '1px solid #2a4a2a', borderRadius: '8px', padding: '10px 12px' },
    tipBlockLabel: { fontSize: '10px', fontWeight: '500', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '5px' },
    tipBlockText: { fontSize: '13px', color: '#e2e8f0', lineHeight: '1.65' },
    transcriptBlock: { background: '#111115', border: '1px solid #2a2a30', borderRadius: '8px', padding: '10px 12px' },
    transcriptLabel: { fontSize: '10px', fontWeight: '500', color: '#555', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '5px' },
    transcriptText: { fontSize: '12px', color: '#666', lineHeight: '1.6' },

    center: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: '#0f0f11', fontFamily: 'sans-serif' },
    spinner: { width: '32px', height: '32px', border: '3px solid #2a2a30', borderTop: '3px solid #7c6fe0', borderRadius: '50%', animation: 'spin .8s linear infinite' },
    btn: { background: 'transparent', border: '1px solid #2a2a30', borderRadius: '6px', color: '#666', padding: '6px 14px', fontSize: '13px', cursor: 'pointer' },
};