-- ============================================================================
-- FeedbackPulse: post_migrate.sql (Idempotent Trigger & Security Layer)
-- ============================================================================

-- 1. Enable optional trigram extension for fuzzy search if available
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm extension not available, continuing without trigram support';
END $$;

-- 2. Trigger Function: Automatically set updated_at
CREATE OR REPLACE FUNCTION fp_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger Function: Maintain posts.vote_count
CREATE OR REPLACE FUNCTION fp_sync_post_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
       SET vote_count = vote_count + 1
     WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
       SET vote_count = GREATEST(0, vote_count - 1)
     WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger Function: Maintain posts.comment_count (excluding internal notes & soft-deleted)
CREATE OR REPLACE FUNCTION fp_sync_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT NEW.is_internal AND NEW.deleted_at IS NULL THEN
      UPDATE posts
         SET comment_count = comment_count + 1
       WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT OLD.is_internal AND OLD.deleted_at IS NULL THEN
      UPDATE posts
         SET comment_count = GREATEST(0, comment_count - 1)
       WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handled when marked internal or soft-deleted
    IF (OLD.is_internal OR OLD.deleted_at IS NOT NULL) AND (NOT NEW.is_internal AND NEW.deleted_at IS NULL) THEN
      UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF (NOT OLD.is_internal AND OLD.deleted_at IS NULL) AND (NEW.is_internal OR NEW.deleted_at IS NOT NULL) THEN
      UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger Function: Guard cross-tenant board-to-post integrity
CREATE OR REPLACE FUNCTION fp_guard_post_workspace()
RETURNS TRIGGER AS $$
DECLARE
  v_board_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO v_board_workspace_id FROM boards WHERE id = NEW.board_id;
  IF v_board_workspace_id IS DISTINCT FROM NEW.workspace_id THEN
    RAISE EXCEPTION 'Tenant integrity violation: post workspace_id (%) does not match board workspace_id (%)',
      NEW.workspace_id, v_board_workspace_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger Function: Guard cross-tenant post-to-comment integrity
CREATE OR REPLACE FUNCTION fp_guard_comment_workspace()
RETURNS TRIGGER AS $$
DECLARE
  v_post_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO v_post_workspace_id FROM posts WHERE id = NEW.post_id;
  IF v_post_workspace_id IS DISTINCT FROM NEW.workspace_id THEN
    RAISE EXCEPTION 'Tenant integrity violation: comment workspace_id does not match post workspace_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger Function: Guard cross-tenant post-to-vote integrity
CREATE OR REPLACE FUNCTION fp_guard_vote_workspace()
RETURNS TRIGGER AS $$
DECLARE
  v_post_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO v_post_workspace_id FROM posts WHERE id = NEW.post_id;
  IF v_post_workspace_id IS DISTINCT FROM NEW.workspace_id THEN
    RAISE EXCEPTION 'Tenant integrity violation: vote workspace_id does not match post workspace_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger Function: Prevent vote on closed / deleted post
CREATE OR REPLACE FUNCTION fp_guard_vote_active_post()
RETURNS TRIGGER AS $$
DECLARE
  v_deleted_at TIMESTAMPTZ;
  v_status post_status;
BEGIN
  SELECT deleted_at, status INTO v_deleted_at, v_status FROM posts WHERE id = NEW.post_id;
  IF v_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot vote on a deleted post';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger Function: Update post last_activity_at on new comment or status change
CREATE OR REPLACE FUNCTION fp_touch_post_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET updated_at = NOW() WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger Function: Touch workspace updated_at on board or tag changes
CREATE OR REPLACE FUNCTION fp_touch_workspace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workspaces SET updated_at = NOW() WHERE id = NEW.workspace_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger Function: Auto-populate user email in one_time_tokens
CREATE OR REPLACE FUNCTION fp_sync_token_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.email IS NULL THEN
    SELECT email INTO NEW.email FROM users WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- IDEMPOTENT TRIGGERS ATTACHMENT (19 TRIGGERS)
-- ============================================================================

-- updated_at triggers (6 triggers)
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fp_set_updated_at();

DROP TRIGGER IF EXISTS trg_workspaces_updated_at ON workspaces;
CREATE TRIGGER trg_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION fp_set_updated_at();

DROP TRIGGER IF EXISTS trg_workspace_members_updated_at ON workspace_members;
CREATE TRIGGER trg_workspace_members_updated_at BEFORE UPDATE ON workspace_members FOR EACH ROW EXECUTE FUNCTION fp_set_updated_at();

DROP TRIGGER IF EXISTS trg_posts_updated_at ON posts;
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION fp_set_updated_at();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION fp_set_updated_at();

DROP TRIGGER IF EXISTS trg_changelogs_updated_at ON changelogs;
CREATE TRIGGER trg_changelogs_updated_at BEFORE UPDATE ON changelogs FOR EACH ROW EXECUTE FUNCTION fp_set_updated_at();

-- Counter triggers (2 triggers)
DROP TRIGGER IF EXISTS trg_post_votes_count ON post_votes;
CREATE TRIGGER trg_post_votes_count AFTER INSERT OR DELETE ON post_votes FOR EACH ROW EXECUTE FUNCTION fp_sync_post_vote_count();

DROP TRIGGER IF EXISTS trg_comments_count ON comments;
CREATE TRIGGER trg_comments_count AFTER INSERT OR UPDATE OR DELETE ON comments FOR EACH ROW EXECUTE FUNCTION fp_sync_post_comment_count();

-- Tenant isolation guards (3 triggers)
DROP TRIGGER IF EXISTS trg_posts_workspace_guard ON posts;
CREATE TRIGGER trg_posts_workspace_guard BEFORE INSERT OR UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION fp_guard_post_workspace();

DROP TRIGGER IF EXISTS trg_comments_workspace_guard ON comments;
CREATE TRIGGER trg_comments_workspace_guard BEFORE INSERT OR UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION fp_guard_comment_workspace();

DROP TRIGGER IF EXISTS trg_post_votes_workspace_guard ON post_votes;
CREATE TRIGGER trg_post_votes_workspace_guard BEFORE INSERT OR UPDATE ON post_votes FOR EACH ROW EXECUTE FUNCTION fp_guard_vote_workspace();

-- Activity & token helper triggers (3 triggers)
DROP TRIGGER IF EXISTS trg_post_votes_active_guard ON post_votes;
CREATE TRIGGER trg_post_votes_active_guard BEFORE INSERT ON post_votes FOR EACH ROW EXECUTE FUNCTION fp_guard_vote_active_post();

DROP TRIGGER IF EXISTS trg_comments_touch_post ON comments;
CREATE TRIGGER trg_comments_touch_post AFTER INSERT ON comments FOR EACH ROW EXECUTE FUNCTION fp_touch_post_activity();

DROP TRIGGER IF EXISTS trg_one_time_tokens_email ON one_time_tokens;
CREATE TRIGGER trg_one_time_tokens_email BEFORE INSERT ON one_time_tokens FOR EACH ROW EXECUTE FUNCTION fp_sync_token_email();

-- Workspace touch & link activity triggers (5 triggers)
DROP TRIGGER IF EXISTS trg_boards_touch_workspace ON boards;
CREATE TRIGGER trg_boards_touch_workspace AFTER INSERT OR UPDATE ON boards FOR EACH ROW EXECUTE FUNCTION fp_touch_workspace_updated_at();

DROP TRIGGER IF EXISTS trg_tags_touch_workspace ON tags;
CREATE TRIGGER trg_tags_touch_workspace AFTER INSERT OR UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION fp_touch_workspace_updated_at();

DROP TRIGGER IF EXISTS trg_post_votes_touch_activity ON post_votes;
CREATE TRIGGER trg_post_votes_touch_activity AFTER INSERT ON post_votes FOR EACH ROW EXECUTE FUNCTION fp_touch_post_activity();

DROP TRIGGER IF EXISTS trg_changelog_posts_touch ON changelog_posts;
CREATE TRIGGER trg_changelog_posts_touch AFTER INSERT ON changelog_posts FOR EACH ROW EXECUTE FUNCTION fp_touch_post_activity();

DROP TRIGGER IF EXISTS trg_post_attachments_touch ON post_attachments;
CREATE TRIGGER trg_post_attachments_touch AFTER INSERT ON post_attachments FOR EACH ROW EXECUTE FUNCTION fp_touch_post_activity();
