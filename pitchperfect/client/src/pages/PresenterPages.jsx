// Phase 6: Stop Session navigates to /report/:id

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SlideViewer from '../components/SlideViewer';
import MetricsPanel from '../components/MetricsPanel';
import CoachPanel from '../components/CoachPanel';
import AudioCapture from '../components/AudioCapture';
import useSocket from '../hooks/useSocket';
import { getSession } from '../api/sessions';

export default function PresenterPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [isPresenting, setIsPresenting] = useState(false);
    const [stopping, setStopping] = useState(false);

    // Called when server confirms session saved
    const handleSessionEnded = (sessionId) => {
        navigate(`/report/${sessionId}`);
    };

    const {
        isConnected,
        metrics,
        currentTip,
        tipLoading,
        tipTopIssue,
        tipSlideIndex,
        liveTranscript,
        sendAudioChunk,
        notifySlideChange,
        endSession,
    } = useSocket(id, handleSessionEnded);

    useEffect(() => {
        getSession(id)
            .then(data => { setSession(data); setLoading(false); })
            .catch(() => { setError('Could not load session'); setLoading(false); });
    }, [id]);

    const goNext = () => {
        if (currentPage >= totalPages) return;
        const completedSlide = currentPage - 1;
        const newSlide = currentPage;
        setCurrentPage(p => p + 1);
        notifySlideChange(completedSlide, newSlide);
    };

    const goPrev = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1);
    };

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [currentPage, totalPages]);

    const handleStart = () => {
        setIsPresenting(true);
    };

    const handleStop = () => {
        setStopping(true);
        setIsPresenting(false);
        endSession(); // server saves report → emits session_ended → navigate to report
    };

    if (loading) return (
        <div style={s.center}>
            <p style={{ color: '#666' }}>Loading session...</p>
        </div>
    );

    if (error) return (
        <div style={s.center}>
            <p style={{ color: '#f87171' }}>{error}</p>
            <button onClick={() => navigate('/')} style={s.backBtn}>← Back</button>
        </div>
    );

    return (
        <div style={s.page}>

            <div style={s.topBar}>
                <button onClick={() => navigate('/')} style={s.backBtn}>← Back</button>
                <div style={s.sessionTitle}>{session?.title}</div>
                <div style={s.topRight}>
                    <div style={s.connRow}>
                        <span style={{ ...s.connDot, background: isConnected ? '#4ade80' : '#f87171' }} />
                        <span style={s.connText}>{isConnected ? 'Connected' : 'Connecting...'}</span>
                    </div>
                    <div style={s.counter}>{currentPage} / {totalPages || session?.totalSlides}</div>
                </div>
            </div>

            <div style={s.main}>
                <div style={s.left}>

                    <AudioCapture
                        isActive={isPresenting}
                        slideIndex={currentPage - 1}
                        onChunk={sendAudioChunk}
                    />

                    {liveTranscript && (
                        <div style={s.transcriptBar}>📝 {liveTranscript}</div>
                    )}

                    <SlideViewer
                        fileUrl={session?.fileUrl}
                        currentPage={currentPage}
                        onPageCount={setTotalPages}
                    />

                    <div style={s.nav}>
                        <button
                            onClick={goPrev}
                            disabled={currentPage <= 1}
                            style={{ ...s.navBtn, opacity: currentPage <= 1 ? 0.3 : 1 }}
                        >
                            ← Prev
                        </button>

                        {stopping ? (
                            <div style={s.savingBox}>
                                <div style={s.savingSpinner} />
                                <span style={{ fontSize: '13px', color: '#7c6fe0' }}>
                                    Saving report...
                                </span>
                            </div>
                        ) : !isPresenting ? (
                            <button
                                onClick={handleStart}
                                disabled={!isConnected}
                                style={{ ...s.startBtn, opacity: isConnected ? 1 : 0.4 }}
                            >
                                🎤 Start Presenting
                            </button>
                        ) : (
                            <button onClick={handleStop} style={s.stopBtn}>
                                ⏹ Stop + View Report
                            </button>
                        )}

                        <button
                            onClick={goNext}
                            disabled={currentPage >= totalPages}
                            style={{ ...s.navBtn, opacity: currentPage >= totalPages ? 0.3 : 1, background: '#7c6fe0' }}
                        >
                            Next →
                        </button>
                    </div>
                </div>

                <div style={s.right}>
                    <MetricsPanel metrics={metrics} />
                    <CoachPanel
                        tip={currentTip}
                        slideIndex={tipSlideIndex}
                        loading={tipLoading}
                        topIssue={tipTopIssue}
                    />
                </div>
            </div>
        </div>
    );
}

const s = {
    page: { minHeight: '100vh', background: '#0f0f11', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system,sans-serif', color: '#fff' },
    topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem 1.5rem', borderBottom: '1px solid #2a2a30', background: '#1a1a1f' },
    sessionTitle: { fontSize: '14px', fontWeight: '500', color: '#ccc' },
    topRight: { display: 'flex', alignItems: 'center', gap: '16px' },
    connRow: { display: 'flex', alignItems: 'center', gap: '6px' },
    connDot: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' },
    connText: { fontSize: '12px', color: '#555' },
    counter: { fontSize: '13px', color: '#555' },
    backBtn: { background: 'transparent', border: '1px solid #2a2a30', borderRadius: '6px', color: '#666', padding: '5px 12px', fontSize: '13px', cursor: 'pointer' },
    main: { display: 'flex', gap: '1rem', padding: '1rem 1.5rem', flex: 1, overflow: 'hidden' },
    left: { flex: 2, display: 'flex', flexDirection: 'column', gap: '.75rem', minWidth: 0 },
    right: { flex: 0, minWidth: '240px', maxWidth: '280px', display: 'flex', flexDirection: 'column', gap: '.75rem' },
    transcriptBar: { padding: '7px 12px', background: '#111115', border: '1px solid #2a2a30', borderRadius: '8px', fontSize: '12px', color: '#555', fontStyle: 'italic' },
    nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem' },
    navBtn: { padding: '8px 18px', background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer' },
    startBtn: { padding: '10px 20px', background: '#166534', border: '1px solid #15803d', borderRadius: '8px', color: '#4ade80', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
    stopBtn: { padding: '10px 20px', background: '#3C3489', border: '1px solid #534AB7', borderRadius: '8px', color: '#EEEDFE', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
    savingBox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#1a1a2f', border: '1px solid #2a2a50', borderRadius: '8px' },
    savingSpinner: { width: '14px', height: '14px', border: '2px solid #2a2a50', borderTop: '2px solid #7c6fe0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
    center: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: '#0f0f11', fontFamily: 'sans-serif' },
};