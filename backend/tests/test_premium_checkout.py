"""Regression tests for premium monetization checkout and status APIs."""

from urllib.parse import urlparse


# Module: Premium package catalog validation for selected monetization packs
def test_payment_packages_include_expected_premium_options(api_client, base_url):
    response = api_client.get(f"{base_url}/api/payments/packages")
    assert response.status_code == 200

    packages = response.json()
    package_ids = {item.get("id") for item in packages}

    assert {"hair_glow", "weight_loss", "anti_age", "stress_relief", "energy_boost", "lifetime_unlock"}.issubset(package_ids)


# Module: Stripe checkout session creation for one-time premium pack purchase
def test_checkout_session_creation_for_premium_pack_returns_url_and_session(api_client, base_url):
    payload = {
        "pack_id": "hair_glow",
        "return_url": f"{base_url}/premium",
    }

    response = api_client.post(f"{base_url}/api/payments/checkout/session", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data.get("session_id"), str) and data["session_id"].startswith("cs_")
    assert isinstance(data.get("url"), str)

    parsed = urlparse(data["url"])
    assert parsed.scheme in {"http", "https"}
    assert bool(parsed.netloc)


# Module: Initial checkout status polling behavior for newly created session
def test_checkout_status_initially_open_and_unpaid_for_new_session(api_client, base_url):
    create_payload = {
        "pack_id": "weight_loss",
        "return_url": f"{base_url}/premium",
    }
    create_response = api_client.post(f"{base_url}/api/payments/checkout/session", json=create_payload)
    assert create_response.status_code == 200
    session_id = create_response.json()["session_id"]

    status_response = api_client.get(f"{base_url}/api/payments/checkout/status/{session_id}")
    assert status_response.status_code == 200

    data = status_response.json()
    assert data.get("status") == "open"
    assert data.get("payment_status") == "unpaid"
    metadata = data.get("metadata") or {}
    assert metadata.get("pack_id") == "weight_loss"


# Module: Input validation checks for invalid premium checkout payloads
def test_checkout_session_rejects_invalid_pack_id(api_client, base_url):
    payload = {
        "pack_id": "unknown_pack",
        "return_url": f"{base_url}/premium",
    }
    response = api_client.post(f"{base_url}/api/payments/checkout/session", json=payload)
    assert response.status_code == 400
    assert response.json().get("detail") == "Invalid premium pack"


def test_checkout_session_rejects_invalid_return_url(api_client, base_url):
    payload = {
        "pack_id": "anti_age",
        "return_url": "javascript:alert(1)",
    }
    response = api_client.post(f"{base_url}/api/payments/checkout/session", json=payload)
    assert response.status_code == 400
    assert response.json().get("detail") == "Invalid return URL"
