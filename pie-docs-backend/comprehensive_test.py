"""
Comprehensive test to check all remaining issues
"""
import requests
import json

BASE_URL = "http://localhost:8001/api/v1/approvals"

print("=" * 70)
print("COMPREHENSIVE ISSUE CHECK")
print("=" * 70)

issues = []
warnings = []

# Test 1: Check API response format matches frontend
print("\n[TEST 1] Frontend-Backend Format Match")
print("-" * 70)
try:
    response = requests.get(f"{BASE_URL}/user/00000000-0000-0000-0000-000000000002/pending", timeout=5)
    if response.status_code == 200:
        data = response.json()
        if len(data) > 0:
            first_item = data[0]

            # Check required frontend fields
            required_fields = [
                'id', 'documentId', 'documentTitle', 'documentType', 'documentUrl',
                'requester', 'currentStep', 'totalSteps', 'chainId', 'priority',
                'deadline', 'status', 'assignedTo', 'createdAt', 'updatedAt'
            ]

            missing_fields = [f for f in required_fields if f not in first_item]

            if missing_fields:
                issues.append(f"API missing frontend fields: {', '.join(missing_fields)}")
            else:
                print(f"  [OK] All {len(required_fields)} required fields present")

            # Check requester structure
            if 'requester' in first_item:
                req = first_item['requester']
                if not all(k in req for k in ['id', 'name', 'email']):
                    issues.append("Requester object missing fields")
                else:
                    print("  [OK] Requester object properly structured")
        else:
            warnings.append("No test data available to verify format")
    else:
        issues.append(f"User pending endpoint returned {response.status_code}")
except Exception as e:
    issues.append(f"User pending endpoint failed: {e}")

# Test 2: Check error handling
print("\n[TEST 2] Error Handling")
print("-" * 70)
try:
    # Test with invalid UUID
    response = requests.get(f"{BASE_URL}/requests/invalid-uuid", timeout=5)
    if response.status_code in [400, 422]:
        print("  [OK] Invalid UUID properly rejected")
    else:
        warnings.append(f"Invalid UUID returned {response.status_code} instead of 400/422")

    # Test with non-existent request
    response = requests.get(f"{BASE_URL}/requests/00000000-0000-0000-0000-000000000000", timeout=5)
    if response.status_code == 404:
        print("  [OK] Non-existent request returns 404")
    else:
        warnings.append(f"Non-existent request returned {response.status_code} instead of 404")

except Exception as e:
    warnings.append(f"Error handling test failed: {e}")

# Test 3: Check approval actions response format
print("\n[TEST 3] Approval Actions Response Format")
print("-" * 70)
try:
    # Get a pending request first
    response = requests.get(f"{BASE_URL}/requests?status=pending&page=1&page_size=1", timeout=5)
    if response.status_code == 200:
        data = response.json()
        if data['total'] > 0:
            request_id = data['requests'][0]['id']

            # Try to get history
            response = requests.get(f"{BASE_URL}/requests/{request_id}/history", timeout=5)
            if response.status_code == 200:
                history = response.json()
                print(f"  [OK] History endpoint returns {len(history)} actions")
            else:
                warnings.append(f"History endpoint returned {response.status_code}")
        else:
            warnings.append("No pending requests to test with")
except Exception as e:
    warnings.append(f"Approval actions test failed: {e}")

# Test 4: Check routing rules format consistency
print("\n[TEST 4] Routing Rules Consistency")
print("-" * 70)
try:
    response = requests.get(f"{BASE_URL}/routing-rules", timeout=5)
    if response.status_code == 200:
        rules = response.json()
        print(f"  [OK] Found {len(rules)} routing rules")

        # Check all conditions are dict format
        for rule in rules:
            if 'conditions' in rule:
                if isinstance(rule['conditions'], list):
                    issues.append(f"Rule '{rule['name']}' still has list-format conditions")
                elif not isinstance(rule['conditions'], dict):
                    issues.append(f"Rule '{rule['name']}' has invalid conditions type")

        if not any('conditions' in issue for issue in issues):
            print("  [OK] All routing rule conditions are dict format")
    else:
        issues.append(f"Routing rules endpoint returned {response.status_code}")
except Exception as e:
    issues.append(f"Routing rules test failed: {e}")

# Test 5: Check pagination works correctly
print("\n[TEST 5] Pagination Functionality")
print("-" * 70)
try:
    # Get first page
    response = requests.get(f"{BASE_URL}/requests?page=1&page_size=2", timeout=5)
    if response.status_code == 200:
        data = response.json()
        if 'page' in data and 'total_pages' in data and 'total' in data:
            print(f"  [OK] Pagination metadata present: page {data['page']}/{data['total_pages']}, total {data['total']}")
        else:
            issues.append("Pagination response missing metadata fields")
    else:
        issues.append(f"Pagination test failed with {response.status_code}")
except Exception as e:
    warnings.append(f"Pagination test failed: {e}")

# Test 6: Check bulk action validation
print("\n[TEST 6] Bulk Action Validation")
print("-" * 70)
try:
    # Test with empty array
    response = requests.post(
        f"{BASE_URL}/requests/bulk-action",
        json={"approval_ids": [], "action": "approve", "user_id": "00000000-0000-0000-0000-000000000002"},
        timeout=5
    )
    if response.status_code == 400:
        print("  [OK] Empty bulk action properly rejected")
    else:
        warnings.append(f"Empty bulk action returned {response.status_code} instead of 400")
except Exception as e:
    warnings.append(f"Bulk action test failed: {e}")

# Test 7: Check auto-route endpoint
print("\n[TEST 7] Auto-Route Functionality")
print("-" * 70)
try:
    test_cases = [
        {"document_type": "contract", "value": 75000, "expected_chain": "High Value Contracts"},
        {"document_type": "invoice", "expected_chain": "Auto-route Invoices"},
        {"document_type": "policy", "expected_chain": "Auto-route Policies"},
    ]

    for test in test_cases:
        response = requests.post(f"{BASE_URL}/requests/auto-route", json=test, timeout=5)
        if response.status_code == 200:
            result = response.json()
            if result.get('matched'):
                print(f"  [OK] {test['document_type']} matched to chain")
            else:
                warnings.append(f"{test['document_type']} did not match any chain")
        else:
            warnings.append(f"Auto-route failed for {test['document_type']}")

except Exception as e:
    warnings.append(f"Auto-route test failed: {e}")

# Summary
print("\n" + "=" * 70)
print("COMPREHENSIVE TEST SUMMARY")
print("=" * 70)
print(f"\n[CRITICAL ISSUES]: {len(issues)}")
for issue in issues:
    print(f"  - {issue}")

print(f"\n[WARNINGS]: {len(warnings)}")
for warning in warnings:
    print(f"  - {warning}")

if len(issues) == 0 and len(warnings) == 0:
    print("\n[SUCCESS] All tests passed!")
elif len(issues) == 0:
    print("\n[GOOD] No critical issues, only warnings")
else:
    print(f"\n[ACTION REQUIRED] {len(issues)} critical issue(s) need fixing")

print("=" * 70)
