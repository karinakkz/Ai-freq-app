"""Regression tests for updated premium package names and pricing."""


from urllib.parse import urlparse


# Module: Premium package catalog names and prices after monetization update
def test_payment_packages_match_updated_titles_and_prices(api_client, base_url):
    response = api_client.get(f"{base_url}/api/payments/packages")
    assert response.status_code == 200

    packages = response.json()
    by_id = {item["id"]: item for item in packages}

    expected = {
        "hair_glow": {"title": "Beauty Glow", "amount": 4.99, "purchase_type": "pack"},
        "weight_loss": {"title": "Weight Loss Metabolism", "amount": 4.99, "purchase_type": "pack"},
        "anti_age": {"title": "Anti-Aging Rejuvenation", "amount": 4.99, "purchase_type": "pack"},
        "stress_relief": {"title": "Stress Relief Calm", "amount": 4.99, "purchase_type": "pack"},
        "energy_boost": {"title": "Energy Boost", "amount": 4.99, "purchase_type": "pack"},
        "lifetime_unlock": {"title": "Lifetime Unlock All", "amount": 49.0, "purchase_type": "lifetime"},
    }

    assert set(expected.keys()).issubset(set(by_id.keys()))
    for pack_id, expected_values in expected.items():
        actual = by_id[pack_id]
        assert actual["title"] == expected_values["title"]
        assert float(actual["amount"]) == expected_values["amount"]
        assert actual["purchase_type"] == expected_values["purchase_type"]
        assert actual["currency"] == "usd"


# Module: Lifetime checkout session and status amount validation (4900 cents)
def test_lifetime_checkout_status_reports_4900_cents(api_client, base_url):
    payload = {
        "pack_id": "lifetime_unlock",
        "return_url": f"{base_url}/premium",
    }
    create_response = api_client.post(f"{base_url}/api/payments/checkout/session", json=payload)
    assert create_response.status_code == 200

    create_data = create_response.json()
    assert isinstance(create_data.get("session_id"), str) and create_data["session_id"].startswith("cs_")
    assert isinstance(create_data.get("url"), str)

    parsed = urlparse(create_data["url"])
    assert parsed.scheme in {"http", "https"}
    assert bool(parsed.netloc)

    session_id = create_data["session_id"]
    status_response = api_client.get(f"{base_url}/api/payments/checkout/status/{session_id}")
    assert status_response.status_code == 200

    status_data = status_response.json()
    assert int(status_data["amount_total"]) == 4900
    assert status_data["currency"] == "usd"
    assert status_data.get("metadata", {}).get("pack_id") == "lifetime_unlock"
    assert status_data.get("metadata", {}).get("purchase_type") == "lifetime"
