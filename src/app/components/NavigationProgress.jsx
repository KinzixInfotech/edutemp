'use client';
export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// Configure NProgress
NProgress.configure({ 
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.08,
  easing: 'ease',
  speed: 500
});

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Stop progress bar when navigation completes
  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  // Start progress bar on all router navigation calls
  useEffect(() => {
    const originalPush = router.push;
    const originalReplace = router.replace;
    const originalBack = router.back;

    router.push = (...args) => {
      NProgress.start();
      return originalPush(...args);
    };

    router.replace = (...args) => {
      NProgress.start();
      return originalReplace(...args);
    };

    router.back = (...args) => {
      NProgress.start();
      return originalBack(...args);
    };

    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
      router.back = originalBack;
    };
  }, [router]);

  // Intercept link clicks
  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target;
      const anchor = target.closest('a');

      if (anchor && anchor.href) {
        const url = new URL(anchor.href);
        const currentUrl = new URL(window.location.href);

        // Start NProgress only for internal navigation
        if (
          url.origin === currentUrl.origin &&
          url.pathname !== currentUrl.pathname &&
          !anchor.target && // Not opening in new tab
          !e.ctrlKey &&
          !e.metaKey &&
          !e.shiftKey &&
          e.button === 0
        ) {
          NProgress.start();
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}
