import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { createSession } from '../api/sessions';
import { useAuth } from '../context/AuthContext';

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

export default function UploadPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef(null);
    const cardRef = useRef(null);
    const stageRef = useRef(null);

    const handleMouseMove = (e) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const rx = (y * -8).toFixed(2);
        const ry = (x * 10).toFixed(2);
        card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    };

    const handleMouseLeave = () => {
        const card = cardRef.current;
        if (!card) return;
        card.style.transform = 'rotateX(0deg) rotateY(0deg)';
    };

    const processFile = async (selected) => {
        if (!selected) return;

        if (selected.type !== 'application/pdf') {
            setError('Please select a PDF file');
            return;
        }

        setFile(selected);
        setError('');

        try {
            const arrayBuffer = await selected.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPageCount(pdf.numPages);
        } catch (err) {
            console.error('Error counting PDF pages:', err);
            setPageCount(0);
        }
    };

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        processFile(selected);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) { setError('Please select a PDF file'); return; }
        if (!title.trim()) { setError('Please enter a presentation title'); return; }

        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('totalSlides', pageCount);
            formData.append('file', file);

            const { session } = await createSession(formData);
            navigate(`/present/${session._id}`);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.error || err.message || 'Upload failed. Is the server running?');
            setLoading(false);
        }
    };

    return (
        <div className="pp-root">
            <div className="scene">
                <div className="mesh" />
                <div className="grid-floor" />
            </div>

            <div className="stage" ref={stageRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                <div className="orb-wrap">
                    <div className="pulse p1" />
                    <div className="pulse p2" />
                    <div className="pulse p3" />
                    <div className="mic">
                        <div className="mic-basket" />
                        <div className="mic-head" />
                        <div className="mic-stem" />
                        <div className="mic-base" />
                    </div>
                </div>

                <div className="card" ref={cardRef}>
                    <div className="topbar">
                        <div className="user">
                            <div className="avatar" />
                            {user?.name || 'User'}
                        </div>
                        <button className="logout" onClick={logout}>Logout</button>
                    </div>

                    <h1>
                        Pitch<span>Perfect</span>
                    </h1>
                    <p className="sub">Upload your slides and get real-time AI coaching</p>

                    <form onSubmit={handleSubmit}>
                        <div className="field">
                            <label htmlFor="title">Presentation title</label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Final Year Project Demo"
                                required
                            />
                        </div>

                        <div className="field">
                            <label>Upload your slides (PDF)</label>
                            <input
                                type="file"
                                accept=".pdf"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                                id="pdf-upload"
                            />
                            <div
                                className={`drop ${isDragging ? 'dragging' : ''}`}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className="file-icon">
                                    <div className="back" />
                                    <div className="front" />
                                </div>
                                {file ? (
                                    <>
                                        <div className="drop-title" style={{ color: '#fff', fontWeight: '500' }}>
                                            📄 {file.name}
                                        </div>
                                        <div className="drop-sub" style={{ color: 'var(--violet-400)', fontWeight: '600' }}>
                                            {pageCount} slide{pageCount === 1 ? '' : 's'} detected
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="drop-title">Click to choose a PDF</div>
                                        <div className="drop-sub">or drag and drop here</div>
                                    </>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="error-banner">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="cta"
                            disabled={loading || !file || !title.trim()}
                            style={{
                                opacity: (loading || !file || !title.trim()) ? 0.5 : 1,
                                cursor: (loading || !file || !title.trim()) ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? 'Uploading Slides...' : 'Start Session →'}
                        </button>
                    </form>
                </div>
            </div>

            <style>{`
                .pp-root{
                    --bg-0:#07070c;
                    --bg-1:#0d0d16;
                    --violet-500:#7c6ff0;
                    --violet-400:#9d8dff;
                    --cyan-400:#5ee6d8;
                    --amber-400:#ffb84d;
                    --ink-0:#f3f2f8;
                    --ink-1:#a9a7bd;
                    --ink-2:#6f6d84;
                    --surface-border:rgba(255,255,255,0.09);
                    font-family:'Sora','Inter',system-ui,sans-serif;
                    min-height:100vh;
                    background:var(--bg-0);
                    color:var(--ink-0);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    padding:48px 20px;
                    position:relative;
                    perspective:1400px;
                    overflow-x:hidden;
                    box-sizing:border-box;
                }
                .pp-root *{ box-sizing:border-box; }

                .scene{
                    position:fixed;
                    inset:0;
                    z-index:0;
                    overflow:hidden;
                }

                .mesh{
                    position:absolute;
                    inset:-10%;
                    background:
                        radial-gradient(38% 30% at 18% 20%, rgba(124,111,240,0.35), transparent 70%),
                        radial-gradient(30% 26% at 85% 15%, rgba(94,230,216,0.18), transparent 70%),
                        radial-gradient(45% 40% at 75% 85%, rgba(255,184,77,0.10), transparent 70%),
                        radial-gradient(60% 50% at 10% 90%, rgba(124,111,240,0.16), transparent 70%);
                    filter:blur(10px);
                    animation:drift 22s ease-in-out infinite alternate;
                }

                @keyframes drift{
                    0%{ transform:translate3d(0,0,0) scale(1); }
                    100%{ transform:translate3d(-2%,2%,0) scale(1.06); }
                }

                .grid-floor{
                    position:absolute;
                    left:50%;
                    bottom:-320px;
                    width:2200px;
                    height:900px;
                    margin-left:-1100px;
                    background-image:
                        linear-gradient(rgba(157,141,255,0.14) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(157,141,255,0.14) 1px, transparent 1px);
                    background-size:56px 56px;
                    transform:rotateX(72deg);
                    -webkit-mask-image:radial-gradient(ellipse 60% 60% at 50% 20%, #000 0%, transparent 72%);
                    mask-image:radial-gradient(ellipse 60% 60% at 50% 20%, #000 0%, transparent 72%);
                    opacity:0.55;
                }

                .orb-wrap{
                    position:absolute;
                    top:64px;
                    left:50%;
                    transform:translateX(-50%);
                    width:130px;
                    height:130px;
                    z-index:1;
                    animation:bob 6s ease-in-out infinite;
                }

                @keyframes bob{
                    0%,100%{ transform:translateX(-50%) translateY(0); }
                    50%{ transform:translateX(-50%) translateY(-14px); }
                }

                .pulse{
                    position:absolute;
                    inset:0;
                    border-radius:50%;
                    border:1.5px solid rgba(157,141,255,0.55);
                    animation:pulse-out 2.4s cubic-bezier(0.2,0.6,0.4,1) infinite;
                    opacity:0;
                }
                .pulse.p2{ animation-delay:0.8s; border-color:rgba(94,230,216,0.5); }
                .pulse.p3{ animation-delay:1.6s; border-color:rgba(255,184,77,0.4); }

                @keyframes pulse-out{
                    0%{ transform:scale(0.72); opacity:0.7; }
                    100%{ transform:scale(1.55); opacity:0; }
                }

                .mic{
                    position:absolute;
                    left:50%;
                    top:50%;
                    transform:translate(-50%,-50%);
                    transform-style:preserve-3d;
                    width:100%;
                    height:100%;
                    animation:mic-nod 3.2s ease-in-out infinite;
                }
                @keyframes mic-nod{
                    0%,100%{ transform:translate(-50%,-50%) rotateZ(-4deg); }
                    50%{ transform:translate(-50%,-50%) rotateZ(4deg); }
                }

                .mic-head{
                    position:absolute;
                    left:50%;
                    top:8%;
                    width:46%;
                    height:52%;
                    margin-left:-23%;
                    border-radius:40px 40px 44px 44px;
                    background:linear-gradient(155deg, #cabfff 0%, var(--violet-400) 38%, var(--violet-500) 72%, #423798 100%);
                    box-shadow:
                        0 20px 34px -14px rgba(124,111,240,0.65),
                        inset -8px -10px 18px rgba(0,0,0,0.35),
                        inset 6px 8px 14px rgba(255,255,255,0.3);
                }
                .mic-head::before{
                    content:"";
                    position:absolute;
                    left:16%; right:16%; top:22%; bottom:38%;
                    background:
                        repeating-linear-gradient(180deg, rgba(0,0,0,0.28) 0 2px, transparent 2px 7px);
                    border-radius:10px;
                    opacity:0.55;
                }
                .mic-head::after{
                    content:"";
                    position:absolute;
                    top:10%; left:22%;
                    width:26%; height:16%;
                    background:rgba(255,255,255,0.5);
                    border-radius:50%;
                    filter:blur(4px);
                }

                .mic-basket{
                    position:absolute;
                    left:50%;
                    top:2%;
                    width:58%;
                    height:34%;
                    margin-left:-29%;
                    border-radius:50%;
                    border:2px solid rgba(255,255,255,0.22);
                    background:
                        radial-gradient(circle at 40% 30%, rgba(255,255,255,0.16), transparent 60%);
                    box-shadow:inset 0 6px 10px rgba(0,0,0,0.25);
                }

                .mic-stem{
                    position:absolute;
                    left:50%;
                    top:58%;
                    width:9%;
                    height:22%;
                    margin-left:-4.5%;
                    background:linear-gradient(180deg, #8a7bff, #5c4fd6);
                    box-shadow:inset -3px 0 6px rgba(0,0,0,0.3);
                }

                .mic-base{
                    position:absolute;
                    left:50%;
                    bottom:6%;
                    width:34%;
                    height:9%;
                    margin-left:-17%;
                    border-radius:50%;
                    background:linear-gradient(180deg, #6a5cea, #4a3fc2);
                    box-shadow:0 6px 14px -4px rgba(124,111,240,0.6);
                }

                .stage{
                    position:relative;
                    z-index:2;
                    width:100%;
                    max-width:440px;
                    padding-top:120px;
                }

                .card{
                    position:relative;
                    background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
                    border:1px solid var(--surface-border);
                    border-radius:24px;
                    padding:36px 32px 32px;
                    backdrop-filter:blur(22px);
                    -webkit-backdrop-filter:blur(22px);
                    box-shadow:
                        0 40px 80px -30px rgba(0,0,0,0.7),
                        0 1px 0 rgba(255,255,255,0.08) inset;
                    transform-style:preserve-3d;
                    transition:transform 0.15s ease-out;
                    will-change:transform;
                }

                .card::before{
                    content:"";
                    position:absolute;
                    inset:0;
                    border-radius:24px;
                    padding:1px;
                    background:linear-gradient(140deg, rgba(157,141,255,0.5), transparent 40%, transparent 60%, rgba(94,230,216,0.25));
                    -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                    -webkit-mask-composite:xor;
                    mask-composite:exclude;
                    pointer-events:none;
                }

                .topbar{
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    margin-bottom:28px;
                }

                .user{
                    display:flex;
                    align-items:center;
                    gap:8px;
                    font-size:14px;
                    color:var(--ink-1);
                    font-weight:500;
                }

                .avatar{
                    position:relative;
                    width:28px;
                    height:28px;
                    border-radius:50%;
                    background:linear-gradient(155deg, #cabfff 0%, var(--violet-400) 45%, var(--violet-500) 100%);
                    box-shadow:
                        0 6px 12px -4px rgba(124,111,240,0.55),
                        inset -3px -4px 6px rgba(0,0,0,0.3),
                        inset 2px 3px 5px rgba(255,255,255,0.3);
                    overflow:hidden;
                    flex:none;
                }
                .avatar::before{
                    content:"";
                    position:absolute;
                    top:24%;
                    left:50%;
                    width:34%;
                    height:34%;
                    margin-left:-17%;
                    border-radius:50%;
                    background:rgba(255,255,255,0.85);
                }
                .avatar::after{
                    content:"";
                    position:absolute;
                    bottom:-8%;
                    left:50%;
                    width:64%;
                    height:42%;
                    margin-left:-32%;
                    border-radius:50% 50% 0 0;
                    background:rgba(255,255,255,0.85);
                }

                .logout{
                    font-size:12.5px;
                    color:var(--ink-1);
                    background:transparent;
                    border:1px solid var(--surface-border);
                    padding:7px 14px;
                    border-radius:10px;
                    cursor:pointer;
                    transition:border-color 0.2s, color 0.2s;
                }
                .logout:hover{ border-color:rgba(255,255,255,0.25); color:var(--ink-0); }

                .card h1{
                    margin:0 0 6px;
                    text-align:center;
                    font-size:27px;
                    font-weight:600;
                    letter-spacing:-0.01em;
                }
                .card h1 span{
                    background:linear-gradient(100deg, var(--cyan-400), var(--violet-400) 55%, var(--amber-400));
                    -webkit-background-clip:text;
                    background-clip:text;
                    color:transparent;
                }

                .sub{
                    text-align:center;
                    color:var(--ink-1);
                    font-size:14px;
                    margin:0 0 30px;
                }

                .card label{
                    display:block;
                    font-size:12.5px;
                    font-weight:600;
                    color:var(--ink-1);
                    margin-bottom:8px;
                }

                .field{ margin-bottom:20px; }

                .card input[type=text]{
                    width:100%;
                    background:rgba(255,255,255,0.035);
                    border:1px solid var(--surface-border);
                    color:var(--ink-0);
                    font-size:14.5px;
                    padding:13px 14px;
                    border-radius:12px;
                    outline:none;
                    transition:border-color 0.2s, background 0.2s;
                    font-family:inherit;
                }
                .card input[type=text]::placeholder{ color:var(--ink-2); }
                .card input[type=text]:focus{
                    border-color:var(--violet-400);
                    background:rgba(124,111,240,0.06);
                }

                .drop{
                    position:relative;
                    border:1.5px dashed rgba(255,255,255,0.16);
                    border-radius:14px;
                    padding:34px 20px;
                    text-align:center;
                    cursor:pointer;
                    transition:border-color 0.2s, background 0.2s, transform 0.2s;
                    background:rgba(255,255,255,0.015);
                }
                .drop:hover, .drop.dragging{
                    border-color:var(--violet-400);
                    background:rgba(124,111,240,0.05);
                    transform:translateY(-2px);
                }

                .file-icon{
                    width:46px;
                    height:38px;
                    margin:0 auto 14px;
                    position:relative;
                    transform-style:preserve-3d;
                    animation:tilt-icon 4s ease-in-out infinite;
                }
                @keyframes tilt-icon{
                    0%,100%{ transform:rotateY(0deg) rotateX(0deg); }
                    50%{ transform:rotateY(14deg) rotateX(-6deg); }
                }
                .file-icon .back{
                    position:absolute;
                    inset:0;
                    border-radius:6px 6px 8px 8px;
                    background:linear-gradient(160deg, #8a7bff, #5c4fd6);
                    box-shadow:0 10px 20px -8px rgba(124,111,240,0.6);
                }
                .file-icon .front{
                    position:absolute;
                    left:0; right:0; bottom:-3px;
                    height:26px;
                    border-radius:6px;
                    background:linear-gradient(160deg, #b3a8ff, #7c6ff0);
                }

                .drop-title{ font-size:14.5px; color:var(--ink-0); margin-bottom:4px; }
                .drop-sub{ font-size:12.5px; color:var(--ink-2); }

                .error-banner{
                    margin-bottom:16px;
                    padding:10px 14px;
                    background:rgba(248,113,113,0.12);
                    border:1px solid rgba(248,113,113,0.3);
                    border-radius:10px;
                    color:#f87171;
                    font-size:13px;
                    text-align:center;
                }

                .cta{
                    width:100%;
                    margin-top:10px;
                    padding:14px;
                    border:none;
                    border-radius:12px;
                    font-size:15px;
                    font-weight:600;
                    color:#100e1a;
                    cursor:pointer;
                    background:linear-gradient(100deg, var(--cyan-400), var(--violet-400) 60%, var(--amber-400));
                    background-size:180% 100%;
                    background-position:0% 0%;
                    box-shadow:0 16px 32px -14px rgba(124,111,240,0.7);
                    transition:background-position 0.4s ease, transform 0.15s ease;
                }
                .cta:hover:not(:disabled){ background-position:100% 0%; transform:translateY(-1px); }
                .cta:active:not(:disabled){ transform:translateY(0); }

                @media (max-width:480px){
                    .stage{ padding-top:96px; }
                    .orb-wrap{ width:88px; height:88px; top:36px; }
                    .card{ padding:28px 22px 26px; }
                }

                @media (prefers-reduced-motion: reduce){
                    .mesh, .orb-wrap, .mic, .pulse, .file-icon{ animation:none !important; }
                }
            `}</style>
        </div>
    );
}