#!/usr/bin/env python3
"""
Database Migration Runner
Executes SQL migration files in order
"""

import sys
import os
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MigrationRunner:
    def __init__(self):
        self.conn = None
        self.migrations_dir = Path(__file__).parent / "migrations"

    def connect(self):
        """Connect to database"""
        try:
            self.conn = psycopg2.connect(settings.DATABASE_URL)
            logger.info("✓ Connected to database successfully")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to connect to database: {e}")
            return False

    def disconnect(self):
        """Disconnect from database"""
        if self.conn:
            self.conn.close()
            logger.info("✓ Disconnected from database")

    def create_migrations_table(self):
        """Create migrations tracking table"""
        try:
            with self.conn.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS schema_migrations (
                        id SERIAL PRIMARY KEY,
                        migration_file VARCHAR(255) UNIQUE NOT NULL,
                        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        success BOOLEAN DEFAULT TRUE,
                        error_message TEXT
                    );
                """)
                self.conn.commit()
                logger.info("✓ Migrations tracking table ready")
                return True
        except Exception as e:
            logger.error(f"✗ Failed to create migrations table: {e}")
            self.conn.rollback()
            return False

    def get_executed_migrations(self):
        """Get list of already executed migrations"""
        try:
            with self.conn.cursor() as cursor:
                cursor.execute(
                    "SELECT migration_file FROM schema_migrations WHERE success = TRUE"
                )
                return set(row[0] for row in cursor.fetchall())
        except Exception as e:
            logger.error(f"✗ Failed to fetch executed migrations: {e}")
            return set()

    def get_migration_files(self):
        """Get list of migration files to execute"""
        if not self.migrations_dir.exists():
            logger.error(f"✗ Migrations directory not found: {self.migrations_dir}")
            return []

        migration_files = sorted(
            [f for f in self.migrations_dir.glob("*.sql")],
            key=lambda x: x.name
        )
        return migration_files

    def execute_migration(self, migration_file):
        """Execute a single migration file"""
        logger.info(f"\n{'='*60}")
        logger.info(f"Executing: {migration_file.name}")
        logger.info(f"{'='*60}")

        try:
            # Read migration file
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql = f.read()

            # Execute migration
            with self.conn.cursor() as cursor:
                cursor.execute(sql)

            # Record successful migration
            with self.conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO schema_migrations (migration_file, success)
                    VALUES (%s, TRUE)
                    ON CONFLICT (migration_file) DO NOTHING
                    """,
                    (migration_file.name,)
                )

            self.conn.commit()
            logger.info(f"✓ {migration_file.name} executed successfully")
            return True

        except Exception as e:
            logger.error(f"✗ Migration failed: {e}")

            # Record failed migration
            try:
                self.conn.rollback()
                with self.conn.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO schema_migrations (migration_file, success, error_message)
                        VALUES (%s, FALSE, %s)
                        ON CONFLICT (migration_file) DO UPDATE
                        SET success = FALSE, error_message = EXCLUDED.error_message
                        """,
                        (migration_file.name, str(e))
                    )
                self.conn.commit()
            except:
                pass

            return False

    def run(self, specific_migration=None):
        """Run migrations"""
        logger.info("\n" + "="*60)
        logger.info("DATABASE MIGRATION RUNNER")
        logger.info("="*60 + "\n")

        # Connect to database
        if not self.connect():
            return False

        # Create migrations tracking table
        if not self.create_migrations_table():
            self.disconnect()
            return False

        # Get migration files
        migration_files = self.get_migration_files()
        if not migration_files:
            logger.warning("No migration files found")
            self.disconnect()
            return True

        # Get already executed migrations
        executed = self.get_executed_migrations()

        # Filter migrations
        if specific_migration:
            migration_files = [f for f in migration_files if f.name == specific_migration]
            if not migration_files:
                logger.error(f"✗ Migration file not found: {specific_migration}")
                self.disconnect()
                return False

        # Execute migrations
        success_count = 0
        failed_count = 0
        skipped_count = 0

        for migration_file in migration_files:
            if migration_file.name in executed:
                logger.info(f"⊘ Skipping {migration_file.name} (already executed)")
                skipped_count += 1
                continue

            if self.execute_migration(migration_file):
                success_count += 1
            else:
                failed_count += 1
                logger.error(f"✗ Stopping due to migration failure")
                break

        # Summary
        logger.info("\n" + "="*60)
        logger.info("MIGRATION SUMMARY")
        logger.info("="*60)
        logger.info(f"✓ Successful: {success_count}")
        logger.info(f"⊘ Skipped:    {skipped_count}")
        logger.info(f"✗ Failed:     {failed_count}")
        logger.info("="*60 + "\n")

        self.disconnect()
        return failed_count == 0


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Run database migrations')
    parser.add_argument(
        '--migration',
        help='Specific migration file to run (e.g., 07-rbac-junction-tables.sql)'
    )
    parser.add_argument(
        '--list',
        action='store_true',
        help='List all migration files'
    )

    args = parser.parse_args()

    runner = MigrationRunner()

    if args.list:
        logger.info("Available migrations:")
        for f in runner.get_migration_files():
            logger.info(f"  - {f.name}")
        return

    success = runner.run(specific_migration=args.migration)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
