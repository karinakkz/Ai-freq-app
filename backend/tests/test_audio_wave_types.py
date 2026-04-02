"""Regression tests for audio wave type generation endpoints."""


# Module: Audio waveform API validation for catalog and custom generators
def test_generate_audio_supports_all_wave_types(api_client, base_url):
    wave_types = ["sine", "triangle", "square", "sawtooth"]

    for wave_type in wave_types:
        response = api_client.get(
            f"{base_url}/api/audio/generate/stress_relief",
            params={"duration": 3, "wave_type": wave_type},
        )
        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("audio/wav")
        assert response.headers.get("x-wave-type") == wave_type
        assert response.content[:4] == b"RIFF"


def test_generate_audio_invalid_wave_type_falls_back_to_sine(api_client, base_url):
    response = api_client.get(
        f"{base_url}/api/audio/generate/stress_relief",
        params={"duration": 3, "wave_type": "invalid_shape"},
    )
    assert response.status_code == 200
    assert response.headers.get("x-wave-type") == "sine"
    assert response.content[:4] == b"RIFF"


def test_custom_audio_supports_square_wave(api_client, base_url):
    response = api_client.get(
        f"{base_url}/api/audio/custom",
        params={"base_hz": 200, "beat_hz": 10, "duration": 3, "wave_type": "square"},
    )
    assert response.status_code == 200
    assert response.headers.get("content-type", "").startswith("audio/wav")
    assert response.content[:4] == b"RIFF"
