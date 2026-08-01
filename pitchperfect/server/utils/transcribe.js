// server/utils/transcribe.js
//
// Bridge between Node.js and Python Whisper service.
// Node can't run Whisper directly — Python does it.
// This file sends audio to Python and gets text back.

const fetch = require('node-fetch');
const FormData = require('form-data');

const PYTHON_URL = process.env.PYTHON_URL || 'http://localhost:8000';

/**
 * Send audio buffer to Whisper, get transcript back
 * @param {Buffer} audioBuffer - raw audio bytes from socket
 * @returns {Promise<string>} - transcript text or empty string
 */
async function transcribeAudio(audioBuffer) {
    try {
        // Build multipart form — Python FastAPI expects a file upload
        const form = new FormData();
        form.append('file', audioBuffer, {
            filename: 'chunk.webm',
            contentType: 'audio/webm',
        });

        const response = await fetch(`${PYTHON_URL}/transcribe`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Python returned status ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.text) {
            return ''; // silence or error — skip this chunk
        }

        return data.text;

    } catch (err) {
        // Don't crash server if one chunk fails
        console.error('❌ transcribeAudio error:', err.message);
        return '';
    }
}

/**
 * Check if Python Whisper service is running
 * @returns {Promise<boolean>}
 */
async function isPythonServiceAlive() {
    try {
        const response = await fetch(`${PYTHON_URL}/health`);
        return response.ok;
    } catch {
        return false;
    }
}

module.exports = { transcribeAudio, isPythonServiceAlive, PYTHON_URL };