"""
End-to-end test of approval workflow
"""
import os
os.environ['DATABASE_URL'] = 'postgresql://piedocs:piedocs123@localhost:5434/piedocs'

from app.database import init_db_pool, get_db_cursor
import requests

init_db_pool()

BASE_URL = "http://localhost:8001/api/v1/approvals"

print("=" * 70)
print("End-to-End Approval Workflow Test")
print("=" * 70)

try:
    # Step 1: Get pending requests
    print("\n[STEP 1] Fetching pending approval requests...")
    response = requests.get(f"{BASE_URL}/requests?status=pending")
    data = response.json()
    pending_requests = data['requests']

    print(f"  Found {len(pending_requests)} pending requests")

    if len(pending_requests) == 0:
        print("  [SKIP] No pending requests to test")
        exit(0)

    # Pick first request
    request = pending_requests[0]
    request_id = request['id']
    print(f"  Testing with request: {request_id}")
    print(f"    Document: {request['document_id']}")
    print(f"    Status: {request['status']}")
    print(f"    Current Step: {request['current_step']}/{request['total_steps']}")

    # Step 2: Get request details
    print("\n[STEP 2] Getting request details...")
    response = requests.get(f"{BASE_URL}/requests/{request_id}")
    request_details = response.json()
    print(f"  Assigned to: {request_details['assigned_to']}")
    print(f"  Priority: {request_details['priority']}")

    # Step 3: Get user pending approvals
    if request_details['assigned_to'] and len(request_details['assigned_to']) > 0:
        user_id = request_details['assigned_to'][0]
        print(f"\n[STEP 3] Getting pending approvals for user {user_id}...")
        response = requests.get(f"{BASE_URL}/user/{user_id}/pending")
        user_approvals = response.json()
        print(f"  User has {len(user_approvals)} pending approvals")

    # Step 4: Get approval metrics
    print(f"\n[STEP 4] Getting approval metrics...")
    response = requests.get(f"{BASE_URL}/requests/{request_id}/metrics")
    metrics = response.json()
    print(f"  Completion: {metrics['completion_percentage']}%")
    print(f"  Time elapsed: {metrics['time_elapsed_seconds']}s")
    print(f"  Is overdue: {metrics['is_overdue']}")

    # Step 5: Approve the request
    print(f"\n[STEP 5] Simulating approval action...")
    approval_data = {
        "user_id": str(user_id),
        "comments": "Approved via end-to-end test",
        "annotations": {}
    }

    print(f"  Attempting to approve request {request_id} as user {user_id}...")
    response = requests.post(f"{BASE_URL}/requests/{request_id}/approve", json=approval_data)

    if response.status_code == 201:
        print(f"  [OK] Approval recorded successfully")
        approval_action = response.json()
        print(f"    Action ID: {approval_action['id']}")
    else:
        print(f"  [INFO] Approval response: {response.status_code}")
        print(f"    {response.text[:200]}")

    # Step 6: Check request history
    print(f"\n[STEP 6] Getting approval history...")
    response = requests.get(f"{BASE_URL}/requests/{request_id}/history")
    history = response.json()
    print(f"  Found {len(history)} actions in history")
    for action in history:
        print(f"    - {action['action']} by {action['user_id']} at {action['created_at']}")

    # Step 7: Check updated status
    print(f"\n[STEP 7] Checking updated request status...")
    response = requests.get(f"{BASE_URL}/requests/{request_id}")
    updated_request = response.json()
    print(f"  Status: {updated_request['status']}")
    print(f"  Current Step: {updated_request['current_step']}/{updated_request['total_steps']}")

    # Step 8: Test auto-routing
    print(f"\n[STEP 8] Testing auto-routing...")
    routing_test = {
        "document_type": "contract",
        "value": 60000
    }
    response = requests.post(f"{BASE_URL}/requests/auto-route", json=routing_test)
    routing_result = response.json()
    print(f"  Matched: {routing_result['matched']}")
    if routing_result['matched']:
        print(f"  Chain ID: {routing_result['chain_id']}")
        print(f"  Chain Name: {routing_result['chain']['name']}")

    print("\n" + "=" * 70)
    print("[SUCCESS] End-to-end test completed!")
    print("=" * 70)

except Exception as e:
    print(f"\n[ERROR] Test failed: {e}")
    import traceback
    traceback.print_exc()
