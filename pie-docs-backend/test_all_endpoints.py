"""
Test all approval API endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8001/api/v1/approvals"

def test_endpoint(method, path, data=None, desc=""):
    """Test an API endpoint and print results"""
    url = f"{BASE_URL}{path}"
    print(f"\n[TEST] {method} {path}")
    if desc:
        print(f"  Description: {desc}")

    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        elif method == "PATCH":
            response = requests.patch(url, json=data, timeout=5)
        elif method == "DELETE":
            response = requests.delete(url, timeout=5)

        print(f"  Status: {response.status_code}")

        if response.status_code < 300:
            print(f"  [OK] Success")
            if response.text:
                try:
                    data = response.json()
                    if isinstance(data, list):
                        print(f"  Response: List with {len(data)} items")
                    elif isinstance(data, dict):
                        print(f"  Response: Dict with keys: {list(data.keys())[:5]}...")
                    else:
                        print(f"  Response: {str(data)[:100]}")
                except:
                    print(f"  Response: {response.text[:100]}")
            return True
        else:
            print(f"  [FAIL] Error")
            print(f"  Response: {response.text[:200]}")
            return False

    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

print("=" * 70)
print("Testing Approval System API Endpoints")
print("=" * 70)

# Track results
total = 0
passed = 0
failed = 0

# Approval Chains
tests = [
    ("GET", "/chains", None, "List all approval chains"),
    ("GET", "/chains/11111111-1111-1111-1111-111111111111", None, "Get specific chain"),
    ("GET", "/chains/11111111-1111-1111-1111-111111111111/steps", None, "List chain steps"),
    ("POST", "/chains/11111111-1111-1111-1111-111111111111/validate", None, "Validate chain"),

    # Routing Rules
    ("GET", "/routing-rules", None, "List routing rules"),
    ("GET", "/routing-rules?is_active=true", None, "List active routing rules"),

    # Approval Requests
    ("GET", "/requests", None, "List approval requests"),
    ("GET", "/requests?page=1&page_size=10", None, "List requests with pagination"),

    # Escalation
    ("POST", "/escalation/check-timeouts", None, "Check escalation timeouts"),

    # Auto-routing
    ("POST", "/requests/auto-route", {"document_type": "contract", "value": 75000}, "Test auto-routing"),
]

for method, path, data, desc in tests:
    total += 1
    if test_endpoint(method, path, data, desc):
        passed += 1
    else:
        failed += 1

print("\n" + "=" * 70)
print(f"Test Results: {passed}/{total} passed, {failed}/{total} failed")
print("=" * 70)

if failed == 0:
    print("[SUCCESS] All endpoints working correctly!")
else:
    print(f"[WARNING] {failed} endpoint(s) need attention")
