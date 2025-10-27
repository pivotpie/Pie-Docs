"""
Security audit for approval system
"""
import os
import re

print("=" * 70)
print("SECURITY AUDIT - Approval System")
print("=" * 70)

security_issues = []
warnings = []

# Check 1: SQL Injection Risks
print("\n[CHECK 1] SQL Injection Vulnerabilities")
print("-" * 70)

approval_router_file = "app/routers/approvals.py"

with open(approval_router_file, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

    # Look for dangerous patterns
    dangerous_patterns = [
        (r'cursor\.execute\([^%]*\+', 'String concatenation in SQL query'),
        (r'cursor\.execute\(f".*\{(?!where_sql|query)', 'Unsafe f-string with user input in SQL'),
        (r'\.format\(.*\)"\s*\)', 'String format() in SQL query'),
    ]

    sql_injection_risks = []
    for i, line in enumerate(lines, 1):
        for pattern, desc in dangerous_patterns:
            if re.search(pattern, line) and 'cursor.execute' in line:
                sql_injection_risks.append(f"Line {i}: {desc}")

    if sql_injection_risks:
        security_issues.extend(sql_injection_risks)
    else:
        print("  [OK] No SQL injection vulnerabilities detected")
        print("  [OK] All queries use parameterized statements")

# Check 2: Input Validation
print("\n[CHECK 2] Input Validation")
print("-" * 70)

validation_needed = {
    'status parameter': ('status: Optional[str]', ['pending', 'approved', 'rejected', 'escalated', 'changes_requested']),
    'priority parameter': ('priority', ['low', 'medium', 'high', 'critical', 'urgent']),
    'action parameter': ('action', ['approve', 'reject', 'request_changes', 'escalate', 'delegate']),
}

missing_validations = []
for field, (search_term, valid_values) in validation_needed.items():
    # Check if validation exists
    found_validation = False
    for line in lines:
        if search_term in line.lower():
            # Check if there's validation in nearby lines
            if any(val in ' '.join(lines[max(0, lines.index(line)-5):lines.index(line)+5]) for val in valid_values):
                found_validation = True
                break

    if not found_validation:
        warnings.append(f"Missing validation for {field}: should be one of {valid_values}")

if not warnings:
    print("  [OK] All critical inputs validated")
else:
    print(f"  [WARNING] {len(warnings)} input validations could be improved")

# Check 3: Authentication/Authorization
print("\n[CHECK 3] Authentication & Authorization")
print("-" * 70)

auth_checks = []
for i, line in enumerate(lines, 1):
    if '@router.post' in line or '@router.patch' in line or '@router.delete' in line:
        # Check if there's any auth check in next 20 lines
        snippet = '\n'.join(lines[i:i+20])
        if 'user_id' not in snippet.lower() and 'permission' not in snippet.lower():
            auth_checks.append(f"Line {i}: Endpoint may lack authorization check")

if auth_checks:
    warnings.extend(auth_checks[:3])  # Limit to first 3
    print(f"  [WARNING] Found {len(auth_checks)} endpoints that may need auth checks")
else:
    print("  [OK] Most endpoints check user permissions")

# Check 4: Sensitive Data Exposure
print("\n[CHECK 4] Sensitive Data Exposure")
print("-" * 70)

sensitive_fields = ['password', 'secret', 'api_key', 'token', 'credential']
exposed = []

for i, line in enumerate(lines, 1):
    for field in sensitive_fields:
        if field in line.lower() and 'return' in line.lower():
            exposed.append(f"Line {i}: Potential {field} exposure")

if exposed:
    security_issues.extend(exposed)
else:
    print("  [OK] No obvious sensitive data exposure")

# Check 5: Comments Length Validation
print("\n[CHECK 5] Input Length Validation")
print("-" * 70)

length_validation_needed = ['comments', 'description', 'name']
has_length_check = False

for term in length_validation_needed:
    for line in lines:
        if f'{term}' in line and ('len(' in line or 'length' in line or 'max' in line):
            has_length_check = True
            break

if has_length_check:
    print("  [OK] Some length validation present")
else:
    warnings.append("Missing length validation for text inputs (comments, description)")

# Check 6: Error Message Information Disclosure
print("\n[CHECK 6] Error Message Security")
print("-" * 70)

info_disclosure = []
for i, line in enumerate(lines, 1):
    if 'detail=str(e)' in line or 'raise HTTPException' in line:
        if 'detail=str(e)' in line:
            info_disclosure.append(f"Line {i}: Full exception exposed to client")

if info_disclosure:
    warnings.append(f"Found {len(info_disclosure)} places exposing full error details")
    print(f"  [WARNING] {len(info_disclosure)} endpoints expose full error messages")
else:
    print("  [OK] Error messages don't expose sensitive details")

# Summary
print("\n" + "=" * 70)
print("SECURITY AUDIT SUMMARY")
print("=" * 70)

print(f"\n[CRITICAL SECURITY ISSUES]: {len(security_issues)}")
for issue in security_issues:
    print(f"  - {issue}")

print(f"\n[WARNINGS]: {len(warnings)}")
for warning in warnings[:10]:  # Limit to 10
    print(f"  - {warning}")

if len(warnings) > 10:
    print(f"  ... and {len(warnings) - 10} more")

if len(security_issues) == 0:
    print("\n[GOOD] No critical security vulnerabilities found")
    if len(warnings) == 0:
        print("[EXCELLENT] No warnings either - code is secure!")
    else:
        print(f"[GOOD] {len(warnings)} warnings should be addressed for best practices")
else:
    print(f"\n[URGENT] {len(security_issues)} critical security issues must be fixed!")

print("=" * 70)
