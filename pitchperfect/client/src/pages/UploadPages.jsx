import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { createSession } from '../api/sessions';

// IMPORTANT: tell PDF.js where its worker file is
// This worker does the heavy PDF parsing in a background thread
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

export default function UploadPage() {
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);       // the File object
    const [pageCount, setPageCount] = useState(0); // PDF page count
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // When user picks a file, count its pages using PDF.js
    // We need page count BEFORE uploading so we can save it to MongoDB
    const handleFileChange = async (e) => {
        const selected = e.target.files[0];
        if (!selected) return;

        if (selected.type !== 'application/pdf') {
            setError('Please select a PDF file');
            return;
        }

        setFile(selected);
        setError('');

        // Read the file into an ArrayBuffer so PDF.js can parse it
        const arrayBuffer = await selected.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPageCount(pdf.numPages);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) { setError('Please select a PDF file'); return; }
        if (!title.trim()) { setError('Please enter a title'); return; }

        setLoading(true);
        setError('');

        try {
            // Build FormData — this is how you send files + text together
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('totalSlides', pageCount);
            formData.append('file', file);

            const { session } = await createSession(formData);

            // Navigate to the presenter page with the new session's ID
            navigate(`/present/${session._id}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed. Is the server running?');
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                {/* Header */}
                <div style={styles.header}>
                    <h1 style={styles.title}>🎤 PitchPerfect</h1>
                    <p style={styles.subtitle}>Upload your slides and get real-time AI coaching</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={styles.form}>

                    {/* Presentation title */}
                    <div style={styles.field}>
                        <label style={styles.label}>Presentation title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Final Year Project Demo"
                            style={styles.input}
                        />
                    </div>

                    {/* File upload */}
                    <div style={styles.field}>
                        <label style={styles.label}>Upload your slides (PDF)</label>
                        <div style={styles.dropzone}>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                style={styles.fileInput}
                                id="file-input"
                            />
                            <label htmlFor="file-input" style={styles.dropLabel}>
                                {file ? (
                                    <div>
                                        <div style={styles.fileName}>📄 {file.name}</div>
                                        <div style={styles.pageCount}>{pageCount} slides detected</div>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📁</div>
                                        <div style={styles.dropText}>Click to choose a PDF</div>
                                        <div style={styles.dropHint}>or drag and drop here</div>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* Error message */}
                    {error && <div style={styles.error}>{error}</div>}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || !file || !title}
                        style={{
                            ...styles.button,
                            opacity: (loading || !file || !title) ? 0.5 : 1,
                            cursor: (loading || !file || !title) ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? 'Uploading...' : 'Start Session →'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: '#0f0f11',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    card: {
        background: '#1a1a1f',
        border: '1px solid #2a2a30',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '480px',
    },
    header: { textAlign: 'center', marginBottom: '2rem' },
    title: { fontSize: '1.8rem', fontWeight: '600', color: '#fff', margin: '0 0 6px' },
    subtitle: { fontSize: '14px', color: '#888', margin: 0 },
    form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '500', color: '#aaa' },
    input: {
        padding: '10px 14px',
        background: '#111115',
        border: '1px solid #2a2a30',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        outline: 'none',
    },
    dropzone: { position: 'relative' },
    fileInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' },
    dropLabel: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        border: '2px dashed #2a2a30',
        borderRadius: '10px',
        cursor: 'pointer',
        textAlign: 'center',
        minHeight: '120px',
        background: '#111115',
        transition: 'border-color .2s',
    },
    fileName: { fontSize: '14px', fontWeight: '500', color: '#fff', marginBottom: '4px' },
    pageCount: { fontSize: '13px', color: '#7c6fe0' },
    dropText: { fontSize: '14px', color: '#666', marginBottom: '4px' },
    dropHint: { fontSize: '12px', color: '#444' },
    error: {
        padding: '10px 14px',
        background: '#2a1515',
        border: '1px solid #5a2020',
        borderRadius: '8px',
        color: '#f87171',
        fontSize: '13px',
    },
    button: {
        padding: '12px',
        background: '#7c6fe0',
        border: 'none',
        borderRadius: '10px',
        color: '#fff',
        fontSize: '15px',
        fontWeight: '500',
    },
};