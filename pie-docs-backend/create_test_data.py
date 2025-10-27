"""
Create comprehensive test data for approvals system
"""
import os
os.environ['DATABASE_URL'] = 'postgresql://piedocs:piedocs123@localhost:5434/piedocs'

from app.database import init_db_pool, get_db_cursor
import uuid
from datetime import datetime, timedelta

init_db_pool()

print("Creating test data for approval system...")
print("=" * 70)

try:
    with get_db_cursor(commit=True) as cursor:
        # First, check if we have test users
        cursor.execute("SELECT id, email FROM users LIMIT 5")
        users = cursor.fetchall()

        if len(users) < 3:
            print("\n[INFO] Creating test users...")
            # Create test users
            test_users = []
            for i in range(1, 6):
                cursor.execute("""
                    INSERT INTO users (email, username, password_hash, full_name, role, is_active, is_verified)
                    VALUES (%s, %s, %s, %s, %s, true, true)
                    ON CONFLICT (email) DO UPDATE SET is_active = true
                    RETURNING id
                """, (
                    f'approver{i}@piedocs.com',
                    f'approver{i}',
                    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyMK0jY7CqOK',  # hashed "password123"
                    f'Approver {i}',
                    'manager' if i <= 2 else 'user'
                ))
                result = cursor.fetchone()
                test_users.append(result['id'])
                print(f"  [OK] Created user: approver{i}@piedocs.com")
        else:
            test_users = [u['id'] for u in users[:5]]
            print(f"\n[INFO] Using existing users: {[u['email'] for u in users[:5]]}")

        # Update chain steps with real approvers
        print("\n[INFO] Assigning approvers to chain steps...")
        cursor.execute("SELECT id, chain_id, step_number, name FROM approval_chain_steps ORDER BY chain_id, step_number")
        steps = cursor.fetchall()

        for step in steps:
            # Assign 1-2 approvers per step
            num_approvers = 1 if step['step_number'] == 1 else 2
            approvers = test_users[:num_approvers]

            cursor.execute("""
                UPDATE approval_chain_steps
                SET approver_ids = %s
                WHERE id = %s
            """, (approvers, str(step['id'])))

            print(f"  [OK] Assigned {num_approvers} approver(s) to {step['name']}")

        # Create test documents
        print("\n[INFO] Creating test documents...")
        test_docs = []
        doc_types = ['contract', 'policy', 'invoice', 'report']

        for i, doc_type in enumerate(doc_types):
            cursor.execute("""
                INSERT INTO documents (title, content, document_type, status, created_by)
                VALUES (%s, %s, %s, 'published', %s)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (
                f'Test {doc_type.title()} {i+1}',
                f'This is a test {doc_type} for approval workflow testing',
                doc_type,
                str(test_users[0])
            ))
            result = cursor.fetchone()
            if result:
                test_docs.append(result['id'])
                print(f"  [OK] Created document: Test {doc_type.title()} {i+1}")

        # Create test approval requests
        print("\n[INFO] Creating test approval requests...")
        chains_map = {
            'contract': '30000000-0000-0000-0000-000000000002',
            'policy': '30000000-0000-0000-0000-000000000003',
            'invoice': '30000000-0000-0000-0000-000000000001',
            'report': '11111111-1111-1111-1111-111111111111'
        }

        for i, (doc_id, doc_type) in enumerate(zip(test_docs, doc_types)):
            chain_id = chains_map.get(doc_type, '11111111-1111-1111-1111-111111111111')

            # Get chain steps to set assigned_to
            cursor.execute("""
                SELECT approver_ids FROM approval_chain_steps
                WHERE chain_id = %s AND step_number = 1
            """, (chain_id,))
            step = cursor.fetchone()
            assigned_to = step['approver_ids'] if step and step['approver_ids'] else test_users[:1]

            deadline = datetime.utcnow() + timedelta(days=3)

            cursor.execute("""
                INSERT INTO approval_requests (
                    document_id, chain_id, requester_id, status, priority,
                    assigned_to, deadline, current_step, total_steps
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, 1, 2)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (
                str(doc_id),
                chain_id,
                str(test_users[0]),
                'pending',
                ['high', 'medium', 'low'][i % 3],
                assigned_to,
                deadline
            ))
            result = cursor.fetchone()
            if result:
                print(f"  [OK] Created approval request for {doc_type}")

        print("\n" + "=" * 70)
        print("[SUCCESS] Test data created successfully!")
        print("\nYou now have:")
        print("  - 5 test users (approver1@piedocs.com - approver5@piedocs.com)")
        print("  - 8 approval chains with assigned approvers")
        print("  - 4 test documents")
        print("  - 4 pending approval requests")
        print("\nPassword for all test users: password123")

except Exception as e:
    print(f"\n[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
