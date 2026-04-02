import time
from datetime import datetime

import pytest


@pytest.fixture
def created_task_ids(api_client, base_url):
    """Track created tasks and clean them up after tests."""
    ids = []
    yield ids
    for task_id in ids:
        api_client.delete(f"{base_url}/api/tasks/{task_id}")


# Module: voice-context chat should be fast and still create reminders
def test_voice_context_chat_creates_reminder_quickly(api_client, base_url, created_task_ids):
    payload = {
        "message": "Create a reminder to drink water at 10:15pm titled TEST_voice_fast_reminder",
        "context": "voice",
    }

    start = time.perf_counter()
    response = api_client.post(f"{base_url}/api/chat", json=payload)
    elapsed = time.perf_counter() - start

    assert response.status_code == 200
    assert elapsed < 3.0

    data = response.json()
    assert isinstance(data.get("reply"), str)
    assert data.get("action") == "create_task"

    action_data = data.get("action_data") or {}
    assert action_data.get("task_created") is True
    task_id = action_data.get("task_id")
    assert isinstance(task_id, str) and task_id
    created_task_ids.append(task_id)

    reminder_time = action_data.get("reminder_time")
    assert isinstance(reminder_time, str)
    datetime.fromisoformat(reminder_time.replace("Z", "+00:00"))


# Module: reminder task feedback should still persist in tasks API after model path changes
def test_voice_context_created_task_persists(api_client, base_url, created_task_ids):
    response = api_client.post(
        f"{base_url}/api/chat",
        json={
            "message": "Set a reminder named TEST_voice_task_persist for 9:45pm",
            "context": "voice assistant",
        },
    )
    assert response.status_code == 200

    data = response.json()
    assert data.get("action") == "create_task"
    action_data = data.get("action_data") or {}
    task_id = action_data.get("task_id")
    assert task_id
    created_task_ids.append(task_id)

    list_response = api_client.get(f"{base_url}/api/tasks", params={"include_expired": "true"})
    assert list_response.status_code == 200
    tasks = list_response.json()

    created_task = next((task for task in tasks if task.get("id") == task_id), None)
    assert created_task is not None
    assert created_task.get("title")
