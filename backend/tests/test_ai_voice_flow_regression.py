import io
import math
import struct
import wave
from datetime import datetime

import pytest
import requests


def _build_test_wav_bytes(duration_sec: float = 0.4, sample_rate: int = 16000, freq_hz: float = 440.0) -> bytes:
    """Create a small mono WAV payload for multipart voice endpoint tests."""
    num_samples = int(sample_rate * duration_sec)
    pcm_frames = bytearray()

    for i in range(num_samples):
        sample = int(0.2 * 32767 * math.sin(2 * math.pi * freq_hz * (i / sample_rate)))
        pcm_frames.extend(struct.pack("<h", sample))

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(bytes(pcm_frames))
    return buffer.getvalue()


@pytest.fixture
def created_task_ids(api_client, base_url):
    """Track created task IDs and clean up after each test."""
    ids = []
    yield ids

    for task_id in ids:
        api_client.delete(f"{base_url}/api/tasks/{task_id}")


# Module: AI chat reminder + task persistence regression checks
def test_chat_reminder_creates_task_and_persists(api_client, base_url, created_task_ids):
    response = api_client.post(
        f"{base_url}/api/chat",
        json={"message": "Remind me to drink water at 9:30pm"},
    )
    assert response.status_code == 200

    data = response.json()
    assert data.get("action") == "create_task"
    action_data = data.get("action_data") or {}
    assert action_data.get("task_created") is True

    task_id = action_data.get("task_id")
    assert task_id
    created_task_ids.append(task_id)

    reminder_time = action_data.get("reminder_time")
    assert isinstance(reminder_time, str)
    datetime.fromisoformat(reminder_time.replace("Z", "+00:00"))

    list_response = api_client.get(f"{base_url}/api/tasks", params={"include_expired": "true"})
    assert list_response.status_code == 200
    tasks = list_response.json()
    created = next((task for task in tasks if task.get("id") == task_id), None)
    assert created is not None
    assert created.get("reminder_time") is not None


# Module: Voice upload endpoint regression checks for audio/file aliases
def test_voice_transcribe_accepts_audio_field_and_returns_ai_response(api_client, base_url):
    wav_bytes = _build_test_wav_bytes()
    files = {"audio": ("test.wav", wav_bytes, "audio/wav")}
    response = requests.post(f"{base_url}/api/voice/transcribe", files=files, timeout=60)
    assert response.status_code == 200

    data = response.json()
    assert "ai_response" in data
    assert isinstance(data.get("ai_response"), str)
    assert isinstance(data.get("text"), str)


def test_voice_process_alias_accepts_file_field_and_returns_ai_response(api_client, base_url):
    wav_bytes = _build_test_wav_bytes()
    files = {"file": ("test.wav", wav_bytes, "audio/wav")}
    response = requests.post(f"{base_url}/api/voice/process", files=files, timeout=60)
    assert response.status_code == 200

    data = response.json()
    assert "ai_response" in data
    assert isinstance(data.get("ai_response"), str)
    assert isinstance(data.get("text"), str)