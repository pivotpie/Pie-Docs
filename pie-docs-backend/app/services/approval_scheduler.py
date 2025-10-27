"""
Background scheduler for approval system tasks.
Handles automatic escalation checks and other periodic tasks.
"""
import logging
import asyncio
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.services.approval_service import ApprovalService

logger = logging.getLogger(__name__)


class ApprovalScheduler:
    """Scheduler for approval system background tasks"""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._setup_jobs()

    def _setup_jobs(self):
        """Configure scheduled jobs"""

        # Check for escalation timeouts every 5 minutes
        self.scheduler.add_job(
            self._check_escalations,
            trigger=IntervalTrigger(minutes=5),
            id='check_escalations',
            name='Check approval escalation timeouts',
            replace_existing=True
        )

        logger.info("Approval scheduler jobs configured")

    async def _check_escalations(self):
        """Background task to check and escalate overdue approvals"""
        try:
            logger.info("Running escalation timeout check...")
            escalated_ids = ApprovalService.check_escalation_timeouts()

            if escalated_ids:
                logger.info(f"Escalated {len(escalated_ids)} approval requests: {escalated_ids}")
            else:
                logger.debug("No approval requests needed escalation")

        except Exception as e:
            logger.error(f"Error in escalation check job: {e}", exc_info=True)

    def start(self):
        """Start the scheduler"""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Approval scheduler started")

    def shutdown(self):
        """Shutdown the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Approval scheduler stopped")


# Global scheduler instance
approval_scheduler = ApprovalScheduler()


def start_approval_scheduler():
    """Start the global approval scheduler"""
    approval_scheduler.start()


def stop_approval_scheduler():
    """Stop the global approval scheduler"""
    approval_scheduler.shutdown()
