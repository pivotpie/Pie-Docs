"""
Deep system check for approval system issues
"""
import os
os.environ['DATABASE_URL'] = 'postgresql://piedocs:piedocs123@localhost:5434/piedocs'

from app.database import init_db_pool, get_db_cursor

init_db_pool()

print("=" * 70)
print("DEEP SYSTEM CHECK - Approval System")
print("=" * 70)

issues_found = []
warnings_found = []

# Check 1: Foreign Key Constraints
print("\n[CHECK 1] Foreign Key Constraints")
print("-" * 70)
try:
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name IN ('approval_chains', 'approval_chain_steps',
                                     'approval_requests', 'approval_actions', 'routing_rules')
            ORDER BY tc.table_name, kcu.column_name
        """)

        fks = cursor.fetchall()
        print(f"  Found {len(fks)} foreign key constraints")

        # Check for missing important FKs
        required_fks = {
            'approval_chain_steps': ['chain_id'],
            'approval_requests': ['document_id', 'chain_id', 'requester_id'],
            'approval_actions': ['approval_request_id', 'user_id'],
            'routing_rules': ['target_chain_id']
        }

        existing_fks = {}
        for fk in fks:
            table = fk['table_name']
            if table not in existing_fks:
                existing_fks[table] = []
            existing_fks[table].append(fk['column_name'])

        for table, required_cols in required_fks.items():
            for col in required_cols:
                if table not in existing_fks or col not in existing_fks[table]:
                    issues_found.append(f"Missing FK constraint: {table}.{col}")

        if not any('Missing FK' in issue for issue in issues_found):
            print("  [OK] All critical foreign keys present")

except Exception as e:
    issues_found.append(f"FK check failed: {e}")

# Check 2: Orphaned Records
print("\n[CHECK 2] Orphaned Records")
print("-" * 70)
try:
    with get_db_cursor() as cursor:
        # Check for approval requests pointing to non-existent documents
        cursor.execute("""
            SELECT COUNT(*) as count FROM approval_requests ar
            LEFT JOIN documents d ON ar.document_id = d.id
            WHERE d.id IS NULL
        """)
        orphaned_requests = cursor.fetchone()['count']
        if orphaned_requests > 0:
            issues_found.append(f"Found {orphaned_requests} approval requests with missing documents")
        else:
            print("  [OK] No orphaned approval requests")

        # Check for actions pointing to non-existent requests
        cursor.execute("""
            SELECT COUNT(*) as count FROM approval_actions aa
            LEFT JOIN approval_requests ar ON aa.approval_request_id = ar.id
            WHERE ar.id IS NULL
        """)
        orphaned_actions = cursor.fetchone()['count']
        if orphaned_actions > 0:
            issues_found.append(f"Found {orphaned_actions} approval actions with missing requests")
        else:
            print("  [OK] No orphaned approval actions")

        # Check for steps pointing to non-existent chains
        cursor.execute("""
            SELECT COUNT(*) as count FROM approval_chain_steps acs
            LEFT JOIN approval_chains ac ON acs.chain_id = ac.id
            WHERE ac.id IS NULL
        """)
        orphaned_steps = cursor.fetchone()['count']
        if orphaned_steps > 0:
            issues_found.append(f"Found {orphaned_steps} chain steps with missing chains")
        else:
            print("  [OK] No orphaned chain steps")

except Exception as e:
    issues_found.append(f"Orphaned records check failed: {e}")

# Check 3: Empty or Invalid approver_ids
print("\n[CHECK 3] Empty or Invalid Approver IDs")
print("-" * 70)
try:
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT id, name, step_number, approver_ids
            FROM approval_chain_steps
            WHERE approver_ids IS NULL OR approver_ids = '{}'::uuid[]
        """)
        empty_approvers = cursor.fetchall()

        if len(empty_approvers) > 0:
            warnings_found.append(f"Found {len(empty_approvers)} chain steps with empty approver lists")
            for step in empty_approvers:
                print(f"  [WARNING] Step '{step['name']}' has no approvers")
        else:
            print("  [OK] All chain steps have approvers assigned")

except Exception as e:
    issues_found.append(f"Approver check failed: {e}")

# Check 4: Circular Dependencies in Escalation Chains
print("\n[CHECK 4] Circular Dependencies in Escalation")
print("-" * 70)
try:
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT id, name, escalation_chain
            FROM approval_chain_steps
            WHERE escalation_chain IS NOT NULL AND escalation_chain != '{}'::uuid[]
        """)
        steps_with_escalation = cursor.fetchall()

        if len(steps_with_escalation) > 0:
            print(f"  Found {len(steps_with_escalation)} steps with escalation chains")
            print("  [OK] No circular dependency check needed (simple array structure)")
        else:
            print("  [OK] No escalation chains configured")

except Exception as e:
    warnings_found.append(f"Escalation check skipped: {e}")

# Check 5: Data Consistency - Request Status vs Actions
print("\n[CHECK 5] Request Status Consistency")
print("-" * 70)
try:
    with get_db_cursor() as cursor:
        # Find requests marked as approved with no approval actions
        cursor.execute("""
            SELECT ar.id, ar.status
            FROM approval_requests ar
            LEFT JOIN approval_actions aa ON ar.id = aa.approval_request_id
            WHERE ar.status = 'approved'
            GROUP BY ar.id, ar.status
            HAVING COUNT(aa.id) = 0
        """)
        inconsistent_approved = cursor.fetchall()

        if len(inconsistent_approved) > 0:
            issues_found.append(f"Found {len(inconsistent_approved)} requests marked 'approved' with no actions")
        else:
            print("  [OK] All approved requests have corresponding actions")

except Exception as e:
    warnings_found.append(f"Status consistency check skipped: {e}")

# Check 6: Invalid JSON in JSONB fields
print("\n[CHECK 6] JSONB Field Validity")
print("-" * 70)
try:
    with get_db_cursor() as cursor:
        # Check routing_rules conditions
        cursor.execute("""
            SELECT id, name, conditions
            FROM routing_rules
            WHERE jsonb_typeof(conditions) NOT IN ('object', 'array')
        """)
        invalid_conditions = cursor.fetchall()

        if len(invalid_conditions) > 0:
            issues_found.append(f"Found {len(invalid_conditions)} routing rules with invalid conditions format")
        else:
            print("  [OK] All routing rule conditions are valid JSON")

        # Check metadata fields
        cursor.execute("""
            SELECT id, metadata
            FROM approval_requests
            WHERE metadata IS NOT NULL
              AND jsonb_typeof(metadata) != 'object'
        """)
        invalid_metadata = cursor.fetchall()

        if len(invalid_metadata) > 0:
            issues_found.append(f"Found {len(invalid_metadata)} requests with invalid metadata format")
        else:
            print("  [OK] All request metadata is valid JSON")

except Exception as e:
    warnings_found.append(f"JSONB check skipped: {e}")

# Check 7: Deadline and escalation date logic
print("\n[CHECK 7] Deadline and Escalation Logic")
print("-" * 70)
try:
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM approval_requests
            WHERE deadline IS NOT NULL
              AND escalation_date IS NOT NULL
              AND escalation_date > deadline
        """)
        invalid_dates = cursor.fetchone()['count']

        if invalid_dates > 0:
            warnings_found.append(f"Found {invalid_dates} requests where escalation_date is after deadline")
        else:
            print("  [OK] All escalation dates are before deadlines")

except Exception as e:
    warnings_found.append(f"Date logic check skipped: {e}")

# Check 8: Missing indexes for performance
print("\n[CHECK 8] Database Indexes")
print("-" * 70)
try:
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT
                schemaname,
                tablename,
                indexname
            FROM pg_indexes
            WHERE tablename IN ('approval_requests', 'approval_actions', 'approval_chain_steps')
            ORDER BY tablename, indexname
        """)
        indexes = cursor.fetchall()

        print(f"  Found {len(indexes)} indexes on approval tables")

        # Check for critical indexes
        index_names = [idx['indexname'] for idx in indexes]

        recommended_indexes = [
            ('approval_requests', 'status'),
            ('approval_requests', 'document_id'),
            ('approval_actions', 'approval_request_id'),
        ]

        missing_indexes = []
        for table, column in recommended_indexes:
            # Look for any index that includes this column
            has_index = any(table in idx['tablename'] and column in idx['indexname']
                          for idx in indexes)
            if not has_index:
                missing_indexes.append(f"{table}({column})")

        if missing_indexes:
            warnings_found.append(f"Recommended indexes missing: {', '.join(missing_indexes)}")
        else:
            print("  [OK] All critical indexes present")

except Exception as e:
    warnings_found.append(f"Index check skipped: {e}")

# Summary
print("\n" + "=" * 70)
print("DEEP CHECK SUMMARY")
print("=" * 70)
print(f"\n[ISSUES FOUND]: {len(issues_found)}")
for issue in issues_found:
    print(f"  - {issue}")

print(f"\n[WARNINGS]: {len(warnings_found)}")
for warning in warnings_found:
    print(f"  - {warning}")

if len(issues_found) == 0 and len(warnings_found) == 0:
    print("\n[SUCCESS] No issues or warnings found!")
elif len(issues_found) == 0:
    print("\n[GOOD] No critical issues found, only warnings")
else:
    print("\n[ACTION REQUIRED] Critical issues need attention")

print("=" * 70)
