import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

export default function SlideViewer({ fileUrl, onPageCount, currentPage, onExtractSlideTexts }) {
    const canvasRef = useRef(null);
    const pdfRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!fileUrl) return;

        const load = async () => {
            try {
                setLoading(true);

                let targetUrl = fileUrl;
                if (!fileUrl.startsWith('http')) {
                    const backendUrl = import.meta.env.VITE_API_URL || '';
                    targetUrl = backendUrl ? `${backendUrl.replace(/\/+$/, '')}/${fileUrl.replace(/^\/+/, '')}` : fileUrl;
                } else if (fileUrl.includes('localhost:5000') && import.meta.env.VITE_API_URL) {
                    targetUrl = fileUrl.replace('http://localhost:5000', import.meta.env.VITE_API_URL.replace(/\/+$/, ''));
                }

                const pdf = await pdfjsLib.getDocument({
                    url: targetUrl,
                    withCredentials: false,
                }).promise;

                pdfRef.current = pdf;
                onPageCount(pdf.numPages);

                if (onExtractSlideTexts) {
                    const slideTexts = {};
                    for (let i = 1; i <= pdf.numPages; i++) {
                        try {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map(item => item.str).join(' ');
                            slideTexts[i - 1] = pageText;
                        } catch (textErr) {
                            console.warn(`Could not extract text for slide ${i}:`, textErr);
                        }
                    }
                    onExtractSlideTexts(slideTexts);
                }

                setLoading(false);
            } catch (err) {
                console.error('PDF load error:', err);
                setError(`Failed to load PDF: ${err.message}`);
                setLoading(false);
            }
        };

        load();
    }, [fileUrl]);

    useEffect(() => {
        if (!pdfRef.current || !canvasRef.current) return;

        const render = async () => {
            try {
                const page = await pdfRef.current.getPage(currentPage);
                const scale = 1.5;
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: ctx, viewport }).promise;
            } catch (err) {
                console.error('Render error:', err);
            }
        };

        render();
    }, [currentPage, pdfRef.current]);

    if (loading) return (
        <div style={s.center}>
            <p style={{ color: '#666', fontSize: '13px' }}>Loading slides...</p>
        </div>
    );

    if (error) return (
        <div style={s.center}>
            <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '8px' }}>{error}</p>
                <p style={{ color: '#444', fontSize: '12px' }}>Check that your server is running on port 5000</p>
            </div>
        </div>
    );

    return (
        <div style={s.wrap}>
            <canvas ref={canvasRef} style={s.canvas} />
        </div>
    );
}

const s = {
    wrap: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '1rem',
        background: '#111115',
        borderRadius: '10px',
        flex: 1,
        overflow: 'auto',
    },
    canvas: {
        maxWidth: '100%',
        borderRadius: '6px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    },
    center: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '300px',
        background: '#111115',
        borderRadius: '10px',
        flex: 1,
    },
};