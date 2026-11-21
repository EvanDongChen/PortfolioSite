/**
 * Fetches each lazy page, so index.tsx can render it and the page transition can
 * load it ahead of time, behind the cover.
 */
export const loadAquarium = () => import('../pages/App');
export const loadPond = () => import('../pages/PondApp');
export const loadShrine = () => import('../pages/ShrineApp');
export const loadSpace = () => import('../pages/SpaceApp');
export const loadSky = () => import('../pages/SkyApp');
export const loadHotpot = () => import('../pages/HotpotApp');
