/**
 * Fetches each lazy page, so index.tsx can render it and the page transition can
 * load it ahead of time, behind the cover.
 */
export const loadAquarium = () => import('../App');
export const loadPond = () => import('../PondApp');
export const loadShrine = () => import('../ShrineApp');
