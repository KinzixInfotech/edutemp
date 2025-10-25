'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
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
 
  useEffect(() => {
    // Complete progress when route changes
    NProgress.done();
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept all link clicks
    const handleClick = (e) => {
      const target = e.target ;
      const anchor = target.closest('a');
      
      if (anchor && anchor.href) {
        const url = new URL(anchor.href);
        const currentUrl = new URL(window.location.href);
        
        // Check if it's an internal link and not same page
        if (
          url.origin === currentUrl.origin &&
          url.pathname !== currentUrl.pathname &&
          !anchor.target && // Not opening in new tab
          !e.ctrlKey && // Not ctrl+click
          !e.metaKey && // Not cmd+click
          !e.shiftKey && // Not shift+click
          e.button === 0 // Left click only
        ) {
          NProgress.start();
        }
      }
    };

    // Add listener to document
    document.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return null;
}
