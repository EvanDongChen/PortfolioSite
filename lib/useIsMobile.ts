import { useEffect, useState } from 'react';

/** Phones and other touch-first screens: narrow windows, or no hover and a coarse pointer. */
const MOBILE = '(max-width: 767px), (hover: none) and (pointer: coarse)';

/** Whether the page is on a phone-sized or touch-only screen, kept up to date as the window changes. */
export const useIsMobile = () => {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && (window.matchMedia?.(MOBILE).matches ?? false));
  useEffect(() => {
    const mq = window.matchMedia?.(MOBILE);
    if (!mq) return;
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mobile;
};
