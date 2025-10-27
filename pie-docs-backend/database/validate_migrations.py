#!/usr/bin/env python3
"""
Database Migration Validator
Validates that all critical Phase 1 migrations were applied successfully
"""

import sys
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
    format='%(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MigrationValidator:
    def __init__(self):
        self.conn = None
        self.validation_results = []

    def connect(self):
        """Connect to database"""
        try:
            self.conn = psycopg2.connect(settings.DATABASE_URL)
            logger.info("✓ Connected to database successfully\n")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to connect to database: {e}")
            return False

    def disconnect(self):
        """Disconnect from database"""
        if self.conn:
            self.conn.close()

    def validate(self, check_name, query, expected_result=None, compare_fn=None):
        """Run a validation check"""
        try:
            with self.conn.cursor() as cursor:
                cursor.execute(query)
                result = cursor.fetchone()

                if compare_fn:
                    success = compare_fn(result)
                elif expected_result is not None:
                    success = result[0] == expected_result
                else:
                    success = result[0] if result else False

                status = "✓" if success else "✗"
                self.validation_results.append(success)

                if success:
                    logger.info(f"{status} {check_name}")
                else:
                    logger.error(f"{status} {check_name}")
                    if result:
                        logger.error(f"   Got: {result[0]}, Expected: {expected_result}")

                return success
        except Exception as e:
            logger.error(f"✗ {check_name}")
            logger.error(f"   Error: {e}")
            self.validation_results.append(False)
            return False

    def run(self):
        """Run all validation checks"""
        logger.info("="*60)
        logger.info("DATABASE MIGRATION VALIDATION")
        logger.info("="*60 + "\n")

        if not self.connect():
            return False

        logger.info("Phase 1: Critical RBAC Tables")
        logger.info("-" * 60)

        # Check user_roles table exists
        self.validate(
            "user_roles table exists",
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_roles')"
        )

        # Check role_permissions table exists
        self.validate(
            "role_permissions table exists",
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'role_permissions')"
        )

        # Check user_roles has correct indexes
        self.validate(
            "user_roles indexes created",
            "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'user_roles'",
            compare_fn=lambda r: r[0] >= 4  # At least 4 indexes (1 PK + 3 created)
        )

        # Check role_permissions has correct indexes
        self.validate(
            "role_permissions indexes created",
            "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'role_permissions'",
            compare_fn=lambda r: r[0] >= 4  # At least 4 indexes
        )

        logger.info("")
        logger.info("Phase 2: User Fields Enhancement")
        logger.info("-" * 60)

        # Check first_name column exists
        self.validate(
            "users.first_name column exists",
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name')"
        )

        # Check last_name column exists
        self.validate(
            "users.last_name column exists",
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name')"
        )

        # Check is_superuser column exists
        self.validate(
            "users.is_superuser column exists",
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_superuser')"
        )

        logger.info("")
        logger.info("Phase 3: Audit Security")
        logger.info("-" * 60)

        # Check checksum column exists
        self.validate(
            "audit_logs.checksum column exists",
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'checksum')"
        )

        # Check chain_checksum column exists
        self.validate(
            "audit_logs.chain_checksum column exists",
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'chain_checksum')"
        )

        # Check checksum trigger exists
        self.validate(
            "audit_checksum_trigger exists",
            "SELECT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'audit_checksum_trigger')"
        )

        logger.info("")
        logger.info("Phase 4: OCR Enhancements")
        logger.info("-" * 60)

        # Check processing_settings column exists
        self.validate(
            "ocr_jobs.processing_settings column exists",
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'ocr_jobs' AND column_name = 'processing_settings')"
        )

        # Check confidence breakdown columns
        self.validate(
            "ocr_results.confidence_word column exists",
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'ocr_results' AND column_name = 'confidence_word')"
        )

        logger.info("")
        logger.info("Phase 5: Search & Permissions")
        logger.info("-" * 60)

        # Check saved_searches table exists
        self.validate(
            "saved_searches table exists",
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_searches')"
        )

        # Check folder_permissions table exists
        self.validate(
            "folder_permissions table exists",
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'folder_permissions')"
        )

        # Check folder permission function exists
        self.validate(
            "check_folder_permission() function exists",
            "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = 'check_folder_permission')"
        )

        logger.info("")
        logger.info("="*60)
        logger.info("VALIDATION SUMMARY")
        logger.info("="*60)

        passed = sum(self.validation_results)
        total = len(self.validation_results)
        failed = total - passed

        logger.info(f"Total Checks: {total}")
        logger.info(f"✓ Passed:     {passed}")
        logger.info(f"✗ Failed:     {failed}")

        if failed == 0:
            logger.info("\n🎉 All validation checks passed!")
            logger.info("Database is ready for API implementation.")
        else:
            logger.error(f"\n⚠️  {failed} validation check(s) failed.")
            logger.error("Please review and fix the issues before proceeding.")

        logger.info("="*60)

        self.disconnect()
        return failed == 0


def main():
    """Main entry point"""
    validator = MigrationValidator()
    success = validator.run()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
