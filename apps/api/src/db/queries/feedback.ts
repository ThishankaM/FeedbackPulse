import { eq, and } from 'drizzle-orm';
import { db } from '../client';
import { postVotes, posts } from '../schema';

export async function toggleVote(params: {
  workspaceId: string;
  postId: string;
  userId?: string;
  visitorId?: string;
}): Promise<{ voted: boolean; voteCount: number }> {
  const { workspaceId, postId, userId, visitorId } = params;

  if (!userId && !visitorId) {
    throw new Error('Either userId or visitorId must be provided to vote');
  }

  return await db.transaction(async (tx) => {
    // 1. Check existing vote
    const whereClause = userId
      ? and(eq(postVotes.postId, postId), eq(postVotes.userId, userId))
      : and(eq(postVotes.postId, postId), eq(postVotes.visitorId, visitorId!));

    const [existing] = await tx.select().from(postVotes).where(whereClause);

    if (existing) {
      // Remove vote
      await tx.delete(postVotes).where(eq(postVotes.id, existing.id));
      const [updatedPost] = await tx
        .select({ voteCount: posts.voteCount })
        .from(posts)
        .where(eq(posts.id, postId));
      return { voted: false, voteCount: updatedPost?.voteCount ?? 0 };
    } else {
      // Add vote
      await tx.insert(postVotes).values({
        workspaceId,
        postId,
        userId: userId || null,
        visitorId: visitorId || null,
      });
      const [updatedPost] = await tx
        .select({ voteCount: posts.voteCount })
        .from(posts)
        .where(eq(posts.id, postId));
      return { voted: true, voteCount: updatedPost?.voteCount ?? 1 };
    }
  });
}
