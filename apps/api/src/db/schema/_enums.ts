import { pgEnum } from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'INVITED', 'SUSPENDED']);
export const workspacePlanEnum = pgEnum('workspace_plan', ['FREE', 'PRO', 'ENTERPRISE']);
export const workspaceMemberRoleEnum = pgEnum('workspace_member_role', ['OWNER', 'ADMIN', 'MEMBER']);
export const workspaceMemberStatusEnum = pgEnum('workspace_member_status', ['ACTIVE', 'INVITED', 'SUSPENDED']);
export const tokenPurposeEnum = pgEnum('token_purpose', [
  'EMAIL_VERIFICATION',
  'PASSWORD_RESET',
  'MAGIC_LINK',
  'WORKSPACE_INVITE',
]);
export const postStatusEnum = pgEnum('post_status', [
  'UNDER_REVIEW',
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CLOSED',
]);
export const moderationStatusEnum = pgEnum('moderation_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'FLAGGED',
]);
export const changelogStatusEnum = pgEnum('changelog_status', [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
]);
export const notificationKindEnum = pgEnum('notification_kind', [
  'POST_STATUS_CHANGED',
  'NEW_COMMENT',
  'COMMENT_REPLY',
  'NEW_CHANGELOG',
  'POST_MERGED',
]);
export const emailStatusEnum = pgEnum('email_status', ['PENDING', 'SENDING', 'SENT', 'FAILED']);
export const auditActionEnum = pgEnum('audit_action', [
  'WORKSPACE_CREATED',
  'WORKSPACE_UPDATED',
  'POST_STATUS_CHANGED',
  'POST_MODERATED',
  'POST_MERGED',
  'POST_DELETED',
  'COMMENT_DELETED',
  'MEMBER_INVITED',
  'MEMBER_ROLE_CHANGED',
  'MEMBER_REMOVED',
  'CHANGELOG_PUBLISHED',
  'API_KEY_CREATED',
  'API_KEY_REVOKED',
]);
export const authProviderEnum = pgEnum('auth_provider', ['EMAIL', 'GOOGLE', 'GITHUB', 'SAML']);
export const tagColorEnum = pgEnum('tag_color', [
  'GRAY',
  'RED',
  'ORANGE',
  'AMBER',
  'GREEN',
  'TEAL',
  'BLUE',
  'INDIGO',
  'PURPLE',
  'PINK',
]);
export const uploadKindEnum = pgEnum('upload_kind', ['IMAGE', 'DOCUMENT', 'AVATAR', 'LOGO']);
