BEGIN;

DROP INDEX IF EXISTS uq_task_submission_once;

CREATE UNIQUE INDEX uq_task_submission_active
  ON task_submissions(task_id,user_id)
  WHERE status IN ('pending','in_review');

COMMIT;
