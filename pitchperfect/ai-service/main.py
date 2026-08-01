import os
import tempfile
import re
import shutil
import sys
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# Set stdout/stderr encoding to utf-8 if possible
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure ffmpeg from imageio_ffmpeg is in PATH for Whisper
try:
    import imageio_ffmpeg
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = os.path.dirname(ffmpeg_exe)
    target_ffmpeg = os.path.join(ffmpeg_dir, "ffmpeg.exe")
    if not os.path.exists(target_ffmpeg):
        shutil.copy(ffmpeg_exe, target_ffmpeg)
    os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
    print(f"[OK] Configured ffmpeg PATH: {ffmpeg_dir}")
except Exception as e:
    print(f"[WARN] Could not auto-configure ffmpeg: {e}")

import whisper

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("[INFO] Loading Whisper model...")
model = whisper.load_model("base")
print("[OK] Whisper model loaded and ready")

# Known Whisper hallucination phrases
# When Whisper hears silence it generates these fake outputs
HALLUCINATIONS = [
    "thank you",
    "thanks for watching",
    "please subscribe",
    "www.",
    ".com",
    "subtitles",
    "subtitle",
    "transcribed by",
    "translated by",
    "c'est",
    "merci",
    "的",
    "了",
    "什麼",
    "emerging into flowers",
    "you",         # single word — likely hallucination
]

def is_hallucination(text: str) -> bool:
    """
    Returns True if the transcript looks like a Whisper hallucination.
    Hallucinations happen when audio is silence or very noisy.
    """
    if not text or len(text.strip()) == 0:
        return True

    lower = text.lower().strip()

    # Too short — single word or less than 3 chars
    if len(lower) < 4:
        return True

    # Contains known hallucination phrases
    for phrase in HALLUCINATIONS:
        if phrase.lower() in lower:
            print(f"   [WARN] Hallucination detected: '{text}' (matched '{phrase}')")
            return True

    # Contains non-English characters (Chinese, Arabic, etc.)
    # when language is set to English
    if re.search(r'[\u4e00-\u9fff\u0600-\u06ff\u0400-\u04ff]', text):
        print(f"   [WARN] Non-English hallucination: '{text}'")
        return True

    return False


@app.get("/health")
def health():
    return {"status": "ok", "model": "whisper-base"}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    tmp_path = None
    try:
        filename = file.filename or "chunk.webm"
        suffix   = ".wav" if filename.endswith(".wav") else ".webm"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content  = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Check file size — too small = silence
        file_size = len(content)
        if file_size < 1000:
            print(f"   [WARN] File too small ({file_size} bytes) — skipping")
            return {"success": False, "text": "", "reason": "too_small"}

        result = model.transcribe(
            tmp_path,
            fp16=False,
            language="en",
            # Higher threshold = less likely to hallucinate on silence
            no_speech_threshold=0.7,
            # Don't use previous context — each chunk is independent
            condition_on_previous_text=False,
            # Suppress common hallucination tokens
            initial_prompt="This is a presentation in English.",
        )

        transcript   = result["text"].strip()
        no_speech_prob = result.get("segments", [{}])[0].get("no_speech_prob", 0) if result.get("segments") else 0

        print(f"   Raw transcript: '{transcript}'")
        print(f"   No-speech probability: {no_speech_prob:.2f}")

        # Reject if Whisper itself thinks there's no speech
        if no_speech_prob > 0.7:
            print(f"   [WARN] High no-speech probability ({no_speech_prob:.2f}) — rejecting")
            return {"success": False, "text": "", "reason": "no_speech"}

        # Reject hallucinations
        if is_hallucination(transcript):
            return {"success": False, "text": "", "reason": "hallucination"}

        print(f"   [OK] Valid transcript: '{transcript[:100]}'")
        return {"success": True, "text": transcript}

    except Exception as e:
        print(f"   [ERROR] {str(e)}")
        return {"success": False, "text": "", "error": str(e)}

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)