// TODO(phase-2) X (Twitter) integration.
//
// - One account per takeover, named "<TICKER>CTO" (max 15 chars).
// - Announcement within 60s of the takeover buy, updates every 2h, replies to
//   mentions. Post bodies come from lib/phase2/llm.ts with the coin's live
//   numbers in context; each published post's URL becomes Action.postUrl.

export interface XClient {
  createAccount(handle: string, bio: string, avatarUrl: string): Promise<{ handle: string }>;
  post(handle: string, text: string, replyToId?: string): Promise<{ id: string; url: string }>;
  mentions(handle: string, sinceId?: string): Promise<{ id: string; user: string; text: string }[]>;
  engagement(postId: string): Promise<{ likes: number; reposts: number; replies: number; views: number }>;
}
