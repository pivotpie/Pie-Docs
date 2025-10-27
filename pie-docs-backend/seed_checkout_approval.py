"""
Seed script to create Document Checkout Approval Chain
Run this to set up the approval workflow for document checkouts
"""
import psycopg2
from psycopg2.extras import RealDictCursor, Json
import uuid
from datetime import datetime

# Database configuration (from .env file)
DB_CONFIG = {
    'host': 'localhost',
    'port': 5434,
    'database': 'piedocs',
    'user': 'piedocs',
    'password': 'piedocs123'
}


def create_checkout_approval_chain():
    """Create approval chain for document checkouts"""
    conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
    cursor = conn.cursor()

    try:
        # 1. Check if chain already exists
        cursor.execute("""
            SELECT id FROM approval_chains
            WHERE name = 'Document Checkout Approval'
        """)
        existing_chain = cursor.fetchone()

        if existing_chain:
            print(f"[OK] Approval chain already exists with ID: {existing_chain['id']}")
            chain_id = existing_chain['id']
        else:
            # 2. Create approval chain
            cursor.execute("""
                INSERT INTO approval_chains (name, description, is_active, document_types)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (
                'Document Checkout Approval',
                'Approval chain for document checkout requests',
                True,
                ['*']  # All document types
            ))
            chain_id = cursor.fetchone()['id']
            print(f"[OK] Created approval chain with ID: {chain_id}")

        # 3. Check if steps exist
        cursor.execute("""
            SELECT COUNT(*) as count FROM approval_chain_steps
            WHERE chain_id = %s
        """, (str(chain_id),))
        step_count = cursor.fetchone()['count']

        if step_count > 0:
            print(f"[OK] Approval chain already has {step_count} step(s)")
        else:
            # 4. Get manager/admin users
            cursor.execute("""
                SELECT id FROM users
                WHERE role IN ('manager', 'admin', 'super_admin')
                ORDER BY created_at
                LIMIT 5
            """)
            managers = cursor.fetchall()

            if not managers:
                print("[WARNING] No managers/admins found. Creating sample user...")
                # Create a sample manager user
                cursor.execute("""
                    INSERT INTO users (email, username, password_hash, full_name, role, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    'manager@piedocs.com',
                    'manager',
                    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eplkKK3OVnFS',  # "password123"
                    'Default Manager',
                    'manager',
                    True
                ))
                manager_id = cursor.fetchone()['id']
                managers = [{'id': manager_id}]
                print(f"[OK] Created sample manager user with ID: {manager_id}")
                print("  Email: manager@piedocs.com")
                print("  Password: password123")

            manager_ids = [str(m['id']) for m in managers]

            # 5. Create Step 1: Manager Approval
            cursor.execute("""
                INSERT INTO approval_chain_steps (
                    chain_id, step_number, name, approver_ids,
                    parallel_approval, consensus_type, timeout_days, is_optional
                )
                VALUES (%s, %s, %s, %s::uuid[], %s, %s, %s, %s)
            """, (
                str(chain_id),
                1,
                'Manager Approval',
                manager_ids,
                False,  # Sequential approval
                'any',  # Any one manager can approve
                3,
                False
            ))
            print(f"[OK] Created Step 1: Manager Approval with {len(manager_ids)} approver(s)")

        # 6. Create routing rule
        cursor.execute("""
            SELECT id FROM routing_rules
            WHERE name = 'Document Checkout Routing'
        """)
        existing_rule = cursor.fetchone()

        if existing_rule:
            print(f"[OK] Routing rule already exists with ID: {existing_rule['id']}")
        else:
            cursor.execute("""
                INSERT INTO routing_rules (name, description, conditions, target_chain_id, priority, is_active)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                'Document Checkout Routing',
                'Route all document checkout requests to the checkout approval chain',
                Json({'action_type': 'document_checkout'}),
                str(chain_id),
                100,
                True
            ))
            rule_id = cursor.fetchone()['id']
            print(f"[OK] Created routing rule with ID: {rule_id}")

        conn.commit()
        print("\n[SUCCESS] Document Checkout Approval Chain setup complete!")
        print(f"\nChain ID: {chain_id}")
        print("You can now request document checkouts and they will require manager approval.")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    print("=" * 60)
    print("Document Checkout Approval Chain Setup")
    print("=" * 60)
    print()

    try:
        create_checkout_approval_chain()
    except psycopg2.OperationalError as e:
        print(f"\n[ERROR] Database connection error: {e}")
        print("\nPlease check:")
        print("  1. PostgreSQL is running")
        print("  2. Database 'piedocs' exists")
        print("  3. Connection settings in DB_CONFIG are correct")
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
