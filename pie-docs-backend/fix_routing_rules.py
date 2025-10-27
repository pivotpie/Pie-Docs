"""
Fix routing rules conditions format inconsistency.
Convert list format to dict format to match service logic.
"""
import os
os.environ['DATABASE_URL'] = 'postgresql://piedocs:piedocs123@localhost:5434/piedocs'

from app.database import init_db_pool, get_db_cursor
import json

# Initialize database pool
init_db_pool()

def convert_list_to_dict_conditions(list_conditions):
    """
    Convert list format:
    [{'field': 'type', 'value': 'invoice', 'operator': 'equals'}]

    To dict format:
    {'type': {'equals': 'invoice'}}
    """
    dict_conditions = {}

    for condition in list_conditions:
        field = condition.get('field')
        operator = condition.get('operator')
        value = condition.get('value')

        if field and operator:
            dict_conditions[field] = {operator: value}

    return dict_conditions

print("Fixing routing rules conditions format...")
print("=" * 60)

try:
    with get_db_cursor(commit=True) as cursor:
        # Get all routing rules
        cursor.execute("SELECT id, name, conditions FROM routing_rules")
        rules = cursor.fetchall()

        fixed_count = 0
        skipped_count = 0

        for rule in rules:
            rule_id = rule['id']
            rule_name = rule['name']
            conditions = rule['conditions']

            print(f"\nProcessing: {rule_name}")
            print(f"  ID: {rule_id}")
            print(f"  Current conditions type: {type(conditions)}")

            # Check if conditions is a list (needs fixing)
            if isinstance(conditions, list):
                print(f"  [WARNING] List format detected - converting...")
                print(f"  Old: {conditions}")

                new_conditions = convert_list_to_dict_conditions(conditions)
                print(f"  New: {new_conditions}")

                # Update the database
                cursor.execute(
                    "UPDATE routing_rules SET conditions = %s WHERE id = %s",
                    (json.dumps(new_conditions), str(rule_id))
                )

                print(f"  [OK] Updated successfully")
                fixed_count += 1

            else:
                print(f"  [OK] Already in dict format - no change needed")
                skipped_count += 1

        print("\n" + "=" * 60)
        print(f"Summary:")
        print(f"  Fixed: {fixed_count}")
        print(f"  Skipped: {skipped_count}")
        print(f"  Total: {len(rules)}")
        print("\n[SUCCESS] All routing rules updated successfully!")

except Exception as e:
    print(f"\n[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
