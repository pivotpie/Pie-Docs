"""
Quick script to seed approval system data
"""
import asyncio
from app.database import init_db_pool, close_db_pool, get_db_cursor

async def seed_approval_data():
    init_db_pool()

    print("Loading approval system seed data...")

    try:
        with open('database/seeds/approval_system_seed.sql', 'r') as f:
            sql_content = f.read()

        # Split into individual statements (skip DO blocks and comments)
        statements = []
        current_stmt = ""
        in_do_block = False

        for line in sql_content.split('\n'):
            line = line.strip()

            # Skip comments
            if line.startswith('--') or not line:
                continue

            # Handle DO blocks
            if 'DO $$' in line or 'DO $' in line:
                in_do_block = True
                current_stmt += line + '\n'
                continue

            if in_do_block:
                current_stmt += line + '\n'
                if 'END $$' in line or 'END $' in line:
                    in_do_block = False
                    statements.append(current_stmt.strip())
                    current_stmt = ""
                continue

            current_stmt += ' ' + line

            if ';' in line:
                statements.append(current_stmt.strip().rstrip(';'))
                current_stmt = ""

        # Execute statements
        success_count = 0
        with get_db_cursor(commit=True) as cursor:
            for stmt in statements:
                if stmt:
                    try:
                        cursor.execute(stmt)
                        success_count += 1
                    except Exception as e:
                        # Check if it's just a duplicate key (which is fine for seeding)
                        if 'duplicate key' in str(e).lower() or 'already exists' in str(e).lower():
                            print(f"  Skipped (already exists): {stmt[:60]}...")
                        else:
                            print(f"  Warning: {str(e)[:100]}")

        print(f"\n✓ Successfully executed {success_count} statements")
        print("✓ Approval system seed data loaded!")

    except Exception as e:
        print(f"✗ Error loading seed data: {e}")
    finally:
        close_db_pool()

if __name__ == "__main__":
    asyncio.run(seed_approval_data())
