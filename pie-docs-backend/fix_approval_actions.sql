-- Add step_number column to approval_actions table
ALTER TABLE approval_actions ADD COLUMN IF NOT EXISTS step_number INTEGER DEFAULT 1;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_approval_actions_request_step
ON approval_actions(approval_request_id, step_number);
