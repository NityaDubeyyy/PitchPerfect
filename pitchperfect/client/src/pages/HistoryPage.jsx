// Shows all past sessions for the logged-in user

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSessions } from '../api/sessions';
import { useAuth } from '../context/AuthContext';

export default function HistoryPage() {
  const navigate        = useNavigate();
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getAllSessions()
      .then(data => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const scoreColor = (score) =>
    score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : '#f87171';

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>🎤 PitchPerfect</div>
          <div style={s.sub}>Welcome back, {user?.name}</div>
        </div>
        <div style={s.headerRight}>
          <button onClick={() => navigate('/')} style={s.newBtn}>
            + New session
          </button>
          <button onClick={handleLogout} style={s.logoutBtn}>
            Logout
          </button>
        </div>
      </div>

      <div style={s.body}>
        <div style={s.sectionTitle}>Your presentations</div>

        {loading && (
          <p style={{ color: '#555', fontSize: '13px' }}>Loading sessions...</p>
        )}

        {!loading && sessions.length === 0 && (
          <div style={s.empty}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📭</div>
            <div style={s.emptyTitle}>No presentations yet</div>
            <div style={s.emptySub}>Upload your first PDF to get started</div>
            <button onClick={() => navigate('/')} style={{ ...s.newBtn, marginTop: '16px' }}>
              Start presenting →
            </button>
          </div>
        )}

        <div style={s.grid}>
          {sessions.map((session) => (
            <div
              key={session._id}
              style={s.card}
              onClick={() =>
                session.status === 'completed'
                  ? navigate(`/report/${session._id}`)
                  : navigate(`/present/${session._id}`)
              }
            >
              <div style={s.cardTop}>
                <div style={s.cardTitle}>{session.title}</div>
                <div style={{
                  ...s.statusBadge,
                  background: session.status === 'completed' ? '#162216' : '#1a1a08',
                  color:      session.status === 'completed' ? '#4ade80' : '#facc15',
                  border:     `0.5px solid ${session.status === 'completed' ? '#2a4a2a' : '#3a3a1a'}`,
                }}>
                  {session.status === 'completed' ? '✓ Completed' : '⏸ In progress'}
                </div>
              </div>

              <div style={s.cardMeta}>
                {session.totalSlides} slides ·{' '}
                {new Date(session.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </div>

              {session.status === 'completed' && session.finalReport && (
                <div style={s.scoreRow}>
                  <div style={{ ...s.scoreNum, color: scoreColor(session.finalReport.overallScore) }}>
                    {session.finalReport.overallScore}/100
                  </div>
                  <div style={s.scoreMeta}>
                    <span>{session.finalReport.avgWPM} wpm</span>
                    <span style={{ margin: '0 6px', color: '#2a2a30' }}>·</span>
                    <span>{session.finalReport.totalFillers} fillers</span>
                    <span style={{ margin: '0 6px', color: '#2a2a30' }}>·</span>
                    <span>{session.finalReport.avgConfidence}% conf</span>
                  </div>
                </div>
              )}

              <div style={s.cardAction}>
                {session.status === 'completed' ? 'View report →' : 'Continue →'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  page:        { minHeight:'100vh',background:'#0f0f11',fontFamily:'-apple-system,sans-serif',color:'#fff' },
  header:      { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.75rem 1.5rem',borderBottom:'1px solid #2a2a30',background:'#1a1a1f' },
  title:       { fontSize:'15px',fontWeight:'600',color:'#fff' },
  sub:         { fontSize:'12px',color:'#555',marginTop:'2px' },
  headerRight: { display:'flex',gap:'8px',alignItems:'center' },
  newBtn:      { padding:'7px 14px',background:'#7c6fe0',border:'none',borderRadius:'8px',color:'#fff',fontSize:'13px',fontWeight:'500',cursor:'pointer' },
  logoutBtn:   { padding:'7px 14px',background:'transparent',border:'1px solid #2a2a30',borderRadius:'8px',color:'#666',fontSize:'13px',cursor:'pointer' },
  body:        { padding:'1.5rem',maxWidth:'900px',margin:'0 auto' },
  sectionTitle:{ fontSize:'11px',fontWeight:'500',color:'#555',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'1rem' },
  grid:        { display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'10px' },
  card:        { background:'#1a1a1f',border:'1px solid #2a2a30',borderRadius:'12px',padding:'1rem 1.1rem',cursor:'pointer',transition:'border-color .15s' },
  cardTop:     { display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px',marginBottom:'6px' },
  cardTitle:   { fontSize:'14px',fontWeight:'500',color:'#fff',flex:1 },
  statusBadge: { fontSize:'10px',padding:'2px 8px',borderRadius:'999px',flexShrink:0 },
  cardMeta:    { fontSize:'12px',color:'#555',marginBottom:'10px' },
  scoreRow:    { display:'flex',alignItems:'center',gap:'10px',padding:'8px 10px',background:'#111115',borderRadius:'8px',marginBottom:'10px' },
  scoreNum:    { fontSize:'18px',fontWeight:'600',flexShrink:0 },
  scoreMeta:   { fontSize:'11px',color:'#555' },
  cardAction:  { fontSize:'12px',color:'#7c6fe0',fontWeight:'500' },
  empty:       { textAlign:'center',padding:'3rem',border:'1px dashed #2a2a30',borderRadius:'12px' },
  emptyTitle:  { fontSize:'15px',fontWeight:'500',color:'#555',marginBottom:'6px' },
  emptySub:    { fontSize:'13px',color:'#333' },
};