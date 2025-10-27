"""
Populate database with synthetic approval data for all tabs
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import uuid
import random

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5434,
    database="piedocs",
    user="piedocs",
    password="piedocs123"
)

print("=" * 70)
print("POPULATING APPROVAL DATA FOR ALL TABS")
print("=" * 70)

cursor = conn.cursor(cursor_factory=RealDictCursor)

# Step 1: Check existing data
print("\n[STEP 1] Checking existing database data...")
cursor.execute("SELECT COUNT(*) as count FROM users")
user_count = cursor.fetchone()['count']
print(f"  Users: {user_count}")

cursor.execute("SELECT COUNT(*) as count FROM documents")
doc_count = cursor.fetchone()['count']
print(f"  Documents: {doc_count}")

cursor.execute("SELECT COUNT(*) as count FROM approval_chains")
chain_count = cursor.fetchone()['count']
print(f"  Approval Chains: {chain_count}")

# Step 2: Get existing users
print("\n[STEP 2] Fetching existing users...")
cursor.execute("""
    SELECT id, username, email, full_name
    FROM users
    ORDER BY created_at
    LIMIT 10
""")
users = cursor.fetchall()
print(f"  Found {len(users)} users")
for u in users:
    print(f"    - {u['username']} ({u['email']})")

# Step 3: Create documents if needed
print("\n[STEP 3] Ensuring documents exist...")
cursor.execute("SELECT COUNT(*) as count FROM documents")
existing_docs = cursor.fetchone()['count']

document_ids = []
if existing_docs < 10:
    print(f"  Creating synthetic documents...")

    doc_types = ['contract', 'invoice', 'policy', 'report', 'proposal', 'memo']
    doc_titles = [
        'Q4 2024 Budget Proposal',
        'Vendor Service Agreement - Tech Solutions Inc',
        'Employee Expense Reimbursement #2847',
        'IT Security Policy Update v3.2',
        'Marketing Campaign Strategy Document',
        'Annual Financial Report 2024',
        'New Employee Onboarding Manual',
        'Office Lease Agreement Renewal',
        'Software License Purchase Request',
        'Company-wide Remote Work Policy',
        'Customer Contract - Enterprise Plan',
        'Department Budget Allocation 2025',
        'Quarterly Performance Review Template',
        'Data Privacy Compliance Report',
        'Supplier Invoice #INV-2024-1523'
    ]

    for i, title in enumerate(doc_titles):
        doc_id = str(uuid.uuid4())
        doc_type = doc_types[i % len(doc_types)]
        uploader_id = users[i % len(users)]['id']

        cursor.execute("""
            INSERT INTO documents
            (id, title, document_type, file_path, storage_location, uploaded_by, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            doc_id,
            title,
            doc_type,
            f'/documents/{doc_type}/{doc_id}.pdf',
            'local',
            uploader_id,
            'active',
            datetime.now() - timedelta(days=random.randint(1, 30)),
            datetime.now()
        ))

        result = cursor.fetchone()
        if result:
            document_ids.append(doc_id)
            print(f"    [OK] Created: {title} ({doc_type})")

    conn.commit()
else:
    cursor.execute("SELECT id FROM documents ORDER BY created_at DESC LIMIT 15")
    document_ids = [row['id'] for row in cursor.fetchall()]
    print(f"  Using {len(document_ids)} existing documents")

# Step 4: Get approval chains
print("\n[STEP 4] Fetching approval chains...")
cursor.execute("SELECT id, name FROM approval_chains ORDER BY created_at LIMIT 5")
chains = cursor.fetchall()
print(f"  Found {len(chains)} chains")
for chain in chains:
    print(f"    - {chain['name']}")

if len(chains) == 0:
    print("  ERROR: No approval chains found. Please run chain creation first.")
    exit(1)

# Step 5: Create approval requests with different statuses
print("\n[STEP 5] Creating approval requests for all statuses...")

statuses = [
    ('pending', 15),      # 15 pending approvals
    ('in_progress', 8),   # 8 in progress
    ('approved', 12),     # 12 approved (for history)
    ('rejected', 4),      # 4 rejected (for history)
    ('escalated', 5),     # 5 escalated
    ('changes_requested', 3)  # 3 with changes requested
]

priorities = ['low', 'medium', 'high', 'critical', 'urgent']

created_requests = []

for status, count in statuses:
    print(f"\n  Creating {count} '{status}' requests...")

    for i in range(count):
        request_id = str(uuid.uuid4())
        doc_id = document_ids[random.randint(0, len(document_ids) - 1)]
        chain = chains[random.randint(0, len(chains) - 1)]
        requester = users[random.randint(0, len(users) - 1)]

        # Get chain steps to determine total steps and assign approvers
        cursor.execute("""
            SELECT id, step_number, approver_ids, consensus_type
            FROM approval_chain_steps
            WHERE chain_id = %s
            ORDER BY step_number
        """, (chain['id'],))
        steps = cursor.fetchall()

        if len(steps) == 0:
            print(f"    [WARN] Skipping - chain '{chain['name']}' has no steps")
            continue

        total_steps = len(steps)
        current_step = 1 if status in ['pending', 'in_progress'] else random.randint(1, total_steps)

        # For pending/in_progress, assign to current step's approvers
        assigned_to = []
        if status in ['pending', 'in_progress', 'escalated']:
            current_step_data = next((s for s in steps if s['step_number'] == current_step), steps[0])
            assigned_to = current_step_data['approver_ids'] or []

            # If no approvers assigned, use some users
            if len(assigned_to) == 0:
                assigned_to = [str(users[0]['id']), str(users[1]['id']) if len(users) > 1 else str(users[0]['id'])]

        priority = priorities[random.randint(0, len(priorities) - 1)]

        # Create deadline based on priority
        if priority == 'critical':
            deadline = datetime.now() + timedelta(days=1)
        elif priority == 'urgent':
            deadline = datetime.now() + timedelta(days=2)
        elif priority == 'high':
            deadline = datetime.now() + timedelta(days=5)
        elif priority == 'medium':
            deadline = datetime.now() + timedelta(days=10)
        else:
            deadline = datetime.now() + timedelta(days=15)

        # For completed statuses, set deadline in the past
        if status in ['approved', 'rejected']:
            deadline = datetime.now() - timedelta(days=random.randint(5, 20))

        created_at = datetime.now() - timedelta(days=random.randint(1, 30))

        try:
            cursor.execute("""
                INSERT INTO approval_requests
                (id, document_id, chain_id, requester_id, status, priority, current_step,
                 total_steps, assigned_to, deadline, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                request_id,
                doc_id,
                chain['id'],
                requester['id'],
                status,
                priority,
                current_step,
                total_steps,
                assigned_to,
                deadline,
                created_at,
                datetime.now()
            ))

            result = cursor.fetchone()
            if result:
                created_requests.append({
                    'id': request_id,
                    'status': status,
                    'priority': priority,
                    'doc_id': doc_id,
                    'chain_id': chain['id']
                })
                print(f"    [OK] Created {status} request (priority: {priority}, step {current_step}/{total_steps})")

        except Exception as e:
            print(f"    [ERROR] Error creating request: {e}")

conn.commit()

# Step 6: Create approval actions for completed requests
print("\n[STEP 6] Creating approval actions (history)...")

action_count = 0
for req in created_requests:
    # Create actions for in_progress, approved, rejected, escalated requests
    if req['status'] in ['in_progress', 'approved', 'rejected', 'escalated', 'changes_requested']:
        num_actions = random.randint(1, 3)

        for action_num in range(num_actions):
            action_id = str(uuid.uuid4())
            actor = users[random.randint(0, len(users) - 1)]

            # Determine action type based on request status
            if req['status'] == 'approved':
                action_type = 'approve'
            elif req['status'] == 'rejected':
                action_type = 'reject'
            elif req['status'] == 'escalated':
                action_type = 'escalate'
            elif req['status'] == 'changes_requested':
                action_type = 'request_changes'
            else:  # in_progress
                action_type = random.choice(['approve', 'comment'])

            comments = [
                "Reviewed and approved as per company policy",
                "All documentation is in order",
                "Budget allocation confirmed",
                "Legal review completed successfully",
                "Requires additional information before approval",
                "Please clarify section 3.2 of the document",
                "Escalating due to amount exceeding threshold",
                "Manager approval needed for this request"
            ]

            try:
                cursor.execute("""
                    INSERT INTO approval_actions
                    (id, approval_request_id, user_id, action, comments, step_number, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    action_id,
                    req['id'],
                    actor['id'],
                    action_type,
                    comments[random.randint(0, len(comments) - 1)],
                    random.randint(1, 3),
                    datetime.now() - timedelta(days=random.randint(0, 10), hours=random.randint(0, 23))
                ))
                action_count += 1
            except Exception as e:
                print(f"    [WARN] Error creating action: {e}")

conn.commit()
print(f"  [OK] Created {action_count} approval actions")

# Step 7: Summary
print("\n" + "=" * 70)
print("DATA POPULATION SUMMARY")
print("=" * 70)

cursor.execute("SELECT status, COUNT(*) as count FROM approval_requests GROUP BY status ORDER BY status")
status_counts = cursor.fetchall()

print("\nApproval Requests by Status:")
total_requests = 0
for row in status_counts:
    print(f"  {row['status']:20} : {row['count']:3} requests")
    total_requests += row['count']

print(f"\n  {'TOTAL':20} : {total_requests:3} requests")

cursor.execute("SELECT COUNT(*) as count FROM approval_actions")
total_actions = cursor.fetchone()['count']
print(f"\nApproval Actions: {total_actions}")

cursor.execute("SELECT COUNT(*) as count FROM documents")
total_docs = cursor.fetchone()['count']
print(f"Documents: {total_docs}")

print("\n" + "=" * 70)
print("[SUCCESS] DATABASE POPULATED SUCCESSFULLY!")
print("=" * 70)
print("\nYou should now see data in all approval interface tabs:")
print("  [OK] Pending Approvals - requests with 'pending' status")
print("  [OK] In Progress - requests with 'in_progress' status")
print("  [OK] Completed - requests with 'approved' status")
print("  [OK] Escalated - requests with 'escalated' status")
print("  [OK] History - all approval actions and completed requests")
print("=" * 70)

cursor.close()
conn.close()
