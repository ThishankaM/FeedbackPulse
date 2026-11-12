export interface ParsedRoute {
  view: string;
  slug: string;
  postId: string | null;
}

/**
 * Parse a browser pathname into the active view, workspace slug, and optional post ID.
 * Supports canonical `/board/:slug` routes as well as `/b/:slug` legacy aliases.
 */
export function parseAppRoute(pathname: string): ParsedRoute {
  const parts = pathname.split('/').filter(Boolean);
  if ((parts[0] === 'board' || parts[0] === 'b') && parts[1]) {
    const slug = parts[1];
    if (parts[2] === 'p' && parts[3]) {
      return { view: 'feedback', slug, postId: parts[3] };
    }
    if (parts[2] === 'roadmap') {
      return { view: 'roadmap', slug, postId: null };
    }
    if (parts[2] === 'changelog') {
      return { view: 'changelog', slug, postId: null };
    }
    if (parts[2] === 'analytics') {
      return { view: 'analytics', slug, postId: null };
    }
    if (parts[2] === 'settings') {
      return { view: 'settings', slug, postId: null };
    }
    return { view: 'feedback', slug, postId: null };
  }
  if (parts[0] === 'dashboard' && parts[1]) {
    return { view: 'dashboard', slug: parts[1], postId: null };
  }
  if (parts.length === 1 && !['login', 'register', 'dashboard', 'b', 'board'].includes(parts[0])) {
    return { view: 'dashboard', slug: parts[0], postId: null };
  }
  if (pathname === '/' && typeof window !== 'undefined' && !localStorage.getItem('feedbackpulse_token')) {
    return { view: 'landing', slug: '', postId: null };
  }
  return { view: 'dashboard', slug: '', postId: null };
}

/**
 * Build the canonical browser URL for an app view and workspace slug.
 */
export function buildAppUrl(view: string, slug: string, postId?: string | null): string {
  if (!slug) return '/';
  if (view === 'feedback') {
    return postId ? `/board/${slug}/p/${postId}` : `/board/${slug}`;
  }
  if (view === 'roadmap') return `/board/${slug}/roadmap`;
  if (view === 'changelog') return `/board/${slug}/changelog`;
  if (view === 'analytics') return `/board/${slug}/analytics`;
  if (view === 'settings') return `/board/${slug}/settings`;
  return `/dashboard/${slug}`;
}
