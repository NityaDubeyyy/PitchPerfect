import { useEffect, useRef, useState } from 'react';

export default function AudioCapture({ isActive, slideIndex, onChunk }) {
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const [status, setStatus] = useState('idle');

    const slideIndexRef = useRef(slideIndex);
    useEffect(() => {
        slideIndexRef.current = slideIndex;
    }, [slideIndex]);

    useEffect(() => {
        if (isActive) {
            startRecording();
        } else {
            stopRecording();
        }
        return () => stopRecording();
    }, [isActive]);

    const intervalRef = useRef(null);

    const startRecording = async () => {
        try {
            setStatus('requesting');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                    channelCount: 1,
                },
            });

            streamRef.current = stream;
            console.log('🎤 Mic ready');

            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                '',
            ];

            let mimeType = '';
            for (const type of mimeTypes) {
                if (!type || MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    break;
                }
            }

            const options = mimeType ? { mimeType } : {};

            const createAndStartRecorder = () => {
                if (!streamRef.current || !streamRef.current.active) return;

                const recorder = new MediaRecorder(streamRef.current, options);
                mediaRecorderRef.current = recorder;

                const chunks = [];
                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 100) {
                        chunks.push(e.data);
                    }
                };

                recorder.onstop = () => {
                    if (chunks.length > 0) {
                        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
                        if (blob.size > 500) {
                            console.log(`🎤 Chunk: ${Math.round(blob.size / 1024)}KB | slide: ${slideIndexRef.current}`);
                            onChunk(blob, slideIndexRef.current);
                        }
                    }
                };

                recorder.start();
            };

            createAndStartRecorder();
            setStatus('recording');
            console.log('🎤 Recording started — self-contained 4 second chunks');

            intervalRef.current = setInterval(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                    createAndStartRecorder();
                }
            }, 4000);

        } catch (err) {
            console.error('Mic error:', err);
            setStatus(err.name === 'NotAllowedError' ? 'denied' : 'idle');
        }
    };

    const stopRecording = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        streamRef.current?.getTracks().forEach(t => t.stop());
        if (status === 'recording') setStatus('stopped');
    };

    return (
        <div style={s.bar}>
            {status === 'idle' && <span style={s.dim}>🎤 Click Start Presenting to begin</span>}
            {status === 'requesting' && <span style={s.dim}>Requesting mic permission...</span>}
            {status === 'denied' && <span style={s.red}>⚠️ Mic denied — allow in browser settings and reload</span>}
            {status === 'recording' && (
                <span style={s.green}>
                    <span style={s.pulse} />
                    Listening — analysing every 4 seconds
                </span>
            )}
            {status === 'stopped' && <span style={s.dim}>Mic stopped</span>}
        </div>
    );
}

const s = {
    bar: {
        display: 'flex', alignItems: 'center',
        padding: '7px 12px', background: '#111115',
        borderRadius: '8px', border: '1px solid #2a2a30',
        fontSize: '12px', minHeight: '34px',
    },
    dim: { color: '#444' },
    red: { color: '#f87171' },
    green: { display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80' },
    pulse: {
        display: 'inline-block', width: '8px', height: '8px',
        borderRadius: '50%', background: '#4ade80',
        animation: 'pulse 1.2s ease-in-out infinite',
    },
};