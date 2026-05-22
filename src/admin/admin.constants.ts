export const ADMIN_AUDIT_RESOURCE_USER = 'User';

/** Admin changed a user's profile field (currently display name only). */
export const ADMIN_AUDIT_ACTION_USER_UPDATE_NAME = 'user.update_display_name';

export const ADMIN_AUDIT_RESOURCE_SUBSCRIPTION = 'Subscription';
export const ADMIN_AUDIT_ACTION_SUBSCRIPTION_OVERRIDE = 'subscription.override';

export const ADMIN_AUDIT_RESOURCE_JOB_SOURCE = 'JobSource';
export const ADMIN_AUDIT_ACTION_JOB_SOURCE_CREATE = 'job_source.create';
export const ADMIN_AUDIT_ACTION_JOB_SOURCE_UPDATE = 'job_source.update';
export const ADMIN_AUDIT_ACTION_JOB_SOURCE_SYNC = 'job_source.sync';
export const ADMIN_AUDIT_ACTION_JOB_SOURCE_SYNC_ACTIVE =
  'job_source.sync_active';

export const ADMIN_AUDIT_RESOURCE_JOB_QUALITY = 'JobQuality';
export const ADMIN_AUDIT_ACTION_JOB_QUALITY_SCAN = 'job_quality.scan';
export const ADMIN_AUDIT_ACTION_JOB_QUALITY_PURGE =
  'job_quality.purge_inactive';

export const ADMIN_AUDIT_RESOURCE_JOB_SOURCE_SUBMISSION = 'JobSourceSubmission';
export const ADMIN_AUDIT_ACTION_SUBMISSION_APPROVE =
  'job_source_submission.approve';
export const ADMIN_AUDIT_ACTION_SUBMISSION_REJECT =
  'job_source_submission.reject';
export const ADMIN_AUDIT_ACTION_SUBMISSION_SPAM = 'job_source_submission.spam';

export const ADMIN_AUDIT_RESOURCE_ADMIN_MEMBERSHIP = 'AdminMembership';
export const ADMIN_AUDIT_ACTION_TEAM_CREATE = 'admin_membership.create';
export const ADMIN_AUDIT_ACTION_TEAM_UPDATE = 'admin_membership.update';
