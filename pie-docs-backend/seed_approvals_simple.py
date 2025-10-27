"""
Simplified script to seed approval system data
"""
from app.database import init_db_pool, close_db_pool, get_db_cursor
import uuid

def seed_approval_data():
    init_db_pool()
    print("Seeding approval system data...")

    try:
        with get_db_cursor(commit=True) as cursor:
            # Insert approval chains
            chains = [
                ('11111111-1111-1111-1111-111111111111', 'Standard Document Approval', 'Basic 2-step approval for general documents', True, ['memo', 'report', 'proposal']),
                ('22222222-2222-2222-2222-222222222222', 'Contract Approval Workflow', 'Multi-step approval for contracts', True, ['contract', 'agreement']),
                ('33333333-3333-3333-3333-333333333333', 'Policy Update Chain', 'Executive approval for policy changes', True, ['policy', 'procedure']),
                ('44444444-4444-4444-4444-444444444444', 'Budget Approval', '3-tier approval for budget documents', True, ['budget', 'financial']),
            ]

            for chain in chains:
                try:
                    cursor.execute("""
                        INSERT INTO approval_chains (id, name, description, is_active, document_types)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, chain)
                    print(f"  + Added chain: {chain[1]}")
                except Exception as e:
                    print(f"  - Skipped chain {chain[1]}: {str(e)[:80]}")

            # Insert approval chain steps
            steps = [
                # Standard Document Approval (2 steps)
                ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 1, 'Manager Review', [], False, 'any', 3, [], {}, False),
                ('a1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 2, 'Director Approval', [], False, 'any', 5, [], {}, False),

                # Contract Approval (3 steps)
                ('a2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 1, 'Legal Review', [], True, 'all', 5, [], {}, False),
                ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 2, 'Finance Approval', [], False, 'any', 3, [], {}, False),
                ('a2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 3, 'Executive Sign-off', [], False, 'any', 7, [], {}, False),

                # Policy Update (2 steps)
                ('a3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 1, 'Compliance Review', [], True, 'majority', 5, [], {}, False),
                ('a3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 2, 'CEO Approval', [], False, 'any', 7, [], {}, False),

                # Budget Approval (3 steps)
                ('a4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', 1, 'Department Head', [], False, 'any', 3, [], {}, False),
                ('a4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444444', 2, 'Finance Director', [], True, 'all', 5, [], {}, False),
                ('a4444444-4444-4444-4444-444444444443', '44444444-4444-4444-4444-444444444444', 3, 'CFO Approval', [], False, 'any', 7, [], {}, False),
            ]

            for step in steps:
                try:
                    import json
                    cursor.execute("""
                        INSERT INTO approval_chain_steps (id, chain_id, step_number, name, approver_ids, parallel_approval, consensus_type, timeout_days, escalation_chain, conditions, is_optional)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, (step[0], step[1], step[2], step[3], step[4], step[5], step[6], step[7], step[8], json.dumps(step[9]), step[10]))
                    print(f"  + Added step: {step[3]}")
                except Exception as e:
                    print(f"  - Skipped step {step[3]}: {str(e)[:80]}")

            # Insert routing rules
            import json
            rules = [
                (str(uuid.uuid4()), 'High Value Contracts', 'Route high-value contracts',
                 {"document_type": {"equals": "contract"}, "value": {"greater_than": 50000}},
                 '22222222-2222-2222-2222-222222222222', 10, True),

                (str(uuid.uuid4()), 'Policy Documents', 'Route all policy documents',
                 {"document_type": {"in": ["policy", "procedure"]}},
                 '33333333-3333-3333-3333-333333333333', 8, True),

                (str(uuid.uuid4()), 'Budget Documents', 'Route budget documents',
                 {"document_type": {"in": ["budget", "financial"]}},
                 '44444444-4444-4444-4444-444444444444', 9, True),

                (str(uuid.uuid4()), 'Standard Documents', 'Default routing',
                 {"document_type": {"not_in": ["contract", "policy", "procedure", "budget", "financial"]}},
                 '11111111-1111-1111-1111-111111111111', 1, True),
            ]

            for rule in rules:
                try:
                    cursor.execute("""
                        INSERT INTO routing_rules (id, name, description, conditions, target_chain_id, priority, is_active)
                        VALUES (%s::uuid, %s, %s, %s::jsonb, %s::uuid, %s, %s)
                    """, (rule[0], rule[1], rule[2], json.dumps(rule[3]), rule[4], rule[5], rule[6]))
                    print(f"  + Added routing rule: {rule[1]}")
                except Exception as e:
                    print(f"  - Skipped routing rule {rule[1]}: {str(e)[:80]}")

        print("\nSUCCESS: Approval system seed data loaded!")
        print("  - 4 approval chains")
        print("  - 10 chain steps")
        print("  - 4 routing rules")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        close_db_pool()

if __name__ == "__main__":
    seed_approval_data()
