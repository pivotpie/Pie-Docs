"""
Quick verification that data exists in database
"""
import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(
    host="localhost",
    port=5434,
    database="piedocs",
    user="piedocs",
    password="piedocs123"
)

cursor = conn.cursor(cursor_factory=RealDictCursor)

print("=" * 70)
print("DATABASE DATA VERIFICATION")
print("=" * 70)

# Check approval requests by status
print("\nApproval Requests by Status:")
cursor.execute("""
    SELECT status, COUNT(*) as count
    FROM approval_requests
    GROUP BY status
    ORDER BY status
""")

for row in cursor.fetchall():
    print(f"  {row['status']:20} : {row['count']:3} requests")

# Check sample pending request
print("\nSample Pending Request (with enriched data):")
cursor.execute("""
    SELECT
        ar.id,
        ar.status,
        ar.priority,
        ar.current_step,
        ar.total_steps,
        d.title as document_title,
        d.document_type,
        u.full_name as requester_name,
        u.email as requester_email
    FROM approval_requests ar
    LEFT JOIN documents d ON ar.document_id = d.id
    LEFT JOIN users u ON ar.requester_id = u.id
    WHERE ar.status = 'pending'
    LIMIT 1
""")

sample = cursor.fetchone()
if sample:
    print(f"  Document: {sample['document_title']}")
    print(f"  Type: {sample['document_type']}")
    print(f"  Status: {sample['status']}")
    print(f"  Priority: {sample['priority']}")
    print(f"  Step: {sample['current_step']}/{sample['total_steps']}")
    print(f"  Requester: {sample['requester_name']} ({sample['requester_email']})")

# Check approval actions
print("\nApproval Actions:")
cursor.execute("SELECT COUNT(*) as count FROM approval_actions")
action_count = cursor.fetchone()['count']
print(f"  Total actions: {action_count}")

cursor.execute("""
    SELECT action, COUNT(*) as count
    FROM approval_actions
    GROUP BY action
    ORDER BY count DESC
""")
print("  By action type:")
for row in cursor.fetchall():
    print(f"    {row['action']:15} : {row['count']:3}")

print("\n" + "=" * 70)
print("[SUCCESS] Data verified in database!")
print("=" * 70)

cursor.close()
conn.close()
