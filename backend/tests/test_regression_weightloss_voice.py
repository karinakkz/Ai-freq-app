import time
from datetime import datetime


# Module: Core API health and frequencies pack regression checks
def test_api_root_status(api_client, base_url):
    response = api_client.get(f"{base_url}/api/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"


def test_weight_loss_pack_available(api_client, base_url):
    response = api_client.get(f"{base_url}/api/packs")
    assert response.status_code == 200
    packs = response.json()
    weight_pack = next((p for p in packs if p.get("id") == "weight_loss_pack"), None)
    assert weight_pack is not None
    assert weight_pack["name"] == "Weight Loss Transformation"
    frequency_ids = {f["id"] for f in weight_pack.get("frequencies", [])}
    assert "weight_loss" in frequency_ids


# Module: Audio endpoint regression checks for catalog playback generation
def test_weight_loss_audio_is_valid_wav(api_client, base_url):
    response = api_client.get(f"{base_url}/api/audio/generate/weight_loss", params={"duration": 5})
    assert response.status_code == 200
    assert response.headers.get("content-type", "").startswith("audio/wav")
    assert response.content[:4] == b"RIFF"


def _send_chat_with_retry(api_client, base_url, message: str, max_attempts: int = 2):
    last_response = None
    for _ in range(max_attempts):
        resp = api_client.post(f"{base_url}/api/chat", json={"message": message})
        last_response = resp
        if resp.status_code == 200:
            data = resp.json()
            if data.get("action") == "create_task" and data.get("action_data", {}).get("task_created"):
                return data
        time.sleep(1)
    assert last_response is not None
    assert last_response.status_code == 200
    return last_response.json()


# Module: AI reminder creation and task persistence regression checks
def test_chat_reminder_creates_task_with_reminder_time(api_client, base_url):
    data = _send_chat_with_retry(api_client, base_url, "Remind me to call Mom at 5pm")
    assert data.get("action") == "create_task"

    action_data = data.get("action_data") or {}
    assert action_data.get("task_created") is True
    assert action_data.get("task_id")
    assert action_data.get("reminder_time")

    parsed = datetime.fromisoformat(action_data["reminder_time"].replace("Z", "+00:00"))
    assert isinstance(parsed, datetime)


def test_chat_created_task_persisted_in_tasks_list(api_client, base_url):
    data = _send_chat_with_retry(api_client, base_url, "Remind me to call Mom at 5pm")
    task_id = (data.get("action_data") or {}).get("task_id")
    assert task_id

    list_response = api_client.get(f"{base_url}/api/tasks", params={"include_expired": "true"})
    assert list_response.status_code == 200
    tasks = list_response.json()

    created = next((t for t in tasks if t.get("id") == task_id), None)
    assert created is not None
    assert created["title"]
    assert created.get("reminder_time") is not None
