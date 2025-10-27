import os
os.environ['DATABASE_URL'] = 'postgresql://piedocs:piedocs123@localhost:5434/piedocs'

from app.database import init_db_pool, get_db_cursor
from app.models.approvals import RoutingRule
import json

# Initialize database pool
init_db_pool()

print("Testing routing rules endpoint logic...")

try:
    with get_db_cursor() as cursor:
        cursor.execute("SELECT * FROM routing_rules ORDER BY priority DESC, name")
        rules = cursor.fetchall()

        print(f"Found {len(rules)} rules")
        print("\nRaw data:")
        for rule in rules:
            print(f"  {dict(rule)}")

        print("\nAttempting to convert to RoutingRule models...")
        rule_models = []
        for rule in rules:
            try:
                rule_dict = dict(rule)
                print(f"\nProcessing: {rule_dict['name']}")
                print(f"  ID type: {type(rule_dict['id'])}")
                print(f"  Conditions type: {type(rule_dict['conditions'])}")
                print(f"  Target chain ID type: {type(rule_dict['target_chain_id'])}")

                # Try to create the model
                model = RoutingRule(**rule_dict)
                rule_models.append(model)
                print(f"  ✓ Successfully created model")
            except Exception as e:
                print(f"  ✗ Error: {e}")
                import traceback
                traceback.print_exc()

        print(f"\n✓ Successfully converted {len(rule_models)} rules to models")

except Exception as e:
    print(f"\n✗ Error: {e}")
    import traceback
    traceback.print_exc()
