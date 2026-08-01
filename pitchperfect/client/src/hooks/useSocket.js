// Phase 6: session_ended now receives report data + navigates to report page

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function useSocket(sessionId, onSessionEnded) {
  const socketRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [currentTip, setCurrentTip] = useState('');
  const [tipLoading, setTipLoading] = useState(false);
  const [tipTopIssue, setTipTopIssue] = useState(null);
  const [tipSlideIndex, setTipSlideIndex] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');

  useEffect(() => {
    if (!sessionId) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setIsConnected(true);
      socket.emit('join_session', { sessionId });
    });

    socket.on('session_joined', ({ message }) => {
      console.log('📋', message);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    socket.on('transcript_update', ({ text }) => {
      setLiveTranscript(text);
    });

    socket.on('metrics_update', (data) => {
      setMetrics(data);
    });

    socket.on('coaching_tip', ({ tip, slideIndex, loading, topIssue }) => {
      setCurrentTip(tip || '');
      setTipLoading(loading || false);
      setTipTopIssue(topIssue || null);
      setTipSlideIndex(slideIndex || 0);
    });

    // Phase 6: call onSessionEnded callback with sessionId
    socket.on('session_ended', ({ sessionId: sid }) => {
      console.log('🏁 Session ended, navigating to report...');
      if (onSessionEnded) onSessionEnded(sid);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const sendAudioChunk = useCallback((audioBlob, slideIndex) => {
    if (!socketRef.current || !isConnected) return;
    audioBlob.arrayBuffer().then((buffer) => {
      socketRef.current.emit('audio_chunk', {
        audioData: buffer,
        slideIndex,
        sessionId,
      });
    });
  }, [isConnected, sessionId]);

  const notifySlideChange = useCallback((completedSlide, newSlide) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('slide_change', { sessionId, completedSlide, newSlide });
  }, [isConnected, sessionId]);

  const endSession = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('end_session', { sessionId });
  }, [isConnected, sessionId]);

  return {
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
  };
}