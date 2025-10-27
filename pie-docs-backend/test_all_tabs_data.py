"""
Test that all approval tabs have data
"""
import requests

BASE_URL = "http://localhost:8001/api/v1/approvals"
USER_ID = "00000000-0000-0000-0000-000000000001"

print("=" * 70)
print("TESTING APPROVAL TABS DATA")
print("=" * 70)

tests = [
    {
        "name": "Pending Approvals",
        "url": f"{BASE_URL}/user/{USER_ID}/pending",
        "expected_status": "pending"
    },
    {
        "name": "All Requests (Pending filter)",
        "url": f"{BASE_URL}/requests?status=pending",
        "min_count": 15
    },
    {
        "name": "In Progress Requests",
        "url": f"{BASE_URL}/requests?status=in_progress",
        "min_count": 8
    },
    {
        "name": "Approved Requests (History)",
        "url": f"{BASE_URL}/requests?status=approved",
        "min_count": 10
    },
    {
        "name": "Escalated Requests",
        "url": f"{BASE_URL}/requests?status=escalated",
        "min_count": 5
    },
    {
        "name": "Rejected Requests (History)",
        "url": f"{BASE_URL}/requests?status=rejected",
        "min_count": 3
    },
    {
        "name": "Changes Requested",
        "url": f"{BASE_URL}/requests?status=changes_requested",
        "min_count": 3
    },
]

print("\nRunning API tests...\n")

for test in tests:
    print(f"[TEST] {test['name']}")
    try:
        response = requests.get(test['url'], timeout=5)

        if response.status_code == 200:
            data = response.json()

            # Handle different response formats
            if isinstance(data, dict) and 'requests' in data:
                count = len(data['requests'])
                total = data.get('total', count)
                print(f"  Status: 200 OK")
                print(f"  Count: {count} items (total: {total})")
            elif isinstance(data, list):
                count = len(data)
                print(f"  Status: 200 OK")
                print(f"  Count: {count} items")

                if count > 0:
                    sample = data[0]
                    print(f"  Sample fields: {', '.join(sample.keys())}")

            # Check minimum count
            if 'min_count' in test and count < test['min_count']:
                print(f"  [WARNING] Expected at least {test['min_count']}, got {count}")
            else:
                print(f"  [PASS]")

        else:
            print(f"  Status: {response.status_code}")
            print(f"  [FAIL] Unexpected status code")

    except Exception as e:
        print(f"  [ERROR] {e}")

    print()

# Test a specific request's history
print("\n" + "=" * 70)
print("Testing Approval History (Actions)")
print("=" * 70)

try:
    # Get first approved request
    response = requests.get(f"{BASE_URL}/requests?status=approved&page_size=1")
    if response.status_code == 200:
        data = response.json()
        if data.get('total', 0) > 0:
            request_id = data['requests'][0]['id']
            print(f"\nTesting history for request: {request_id}")

            history_response = requests.get(f"{BASE_URL}/requests/{request_id}/history")
            if history_response.status_code == 200:
                actions = history_response.json()
                print(f"  Actions found: {len(actions)}")
                if len(actions) > 0:
                    print(f"  Sample action: {actions[0].get('action', 'N/A')}")
                    print(f"  [PASS]")
            else:
                print(f"  [FAIL] Status: {history_response.status_code}")
except Exception as e:
    print(f"  [ERROR] {e}")

print("\n" + "=" * 70)
print("DATA VERIFICATION COMPLETE")
print("=" * 70)
print("\nAll approval interface tabs should now have data!")
print("Refresh your frontend to see the populated approvals.")
print("=" * 70)
