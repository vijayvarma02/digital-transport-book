import { useEffect, useRef, useState } from 'react';
import { fileUrl, cachedFileUrl } from '../services/fileService';

export function useVisible() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '120px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

export function usePrivateImage(path, visible) {
  const [image, setImage] = useState(() => ({ path, url: cachedFileUrl(path), failed: false }));
  useEffect(() => {
    if (!visible || !path) return;
    let active = true;
    const refresh = async () => {
      try { const url = await fileUrl(path); if (active) setImage({ path, url, failed: !url }); }
      catch { if (active) setImage({ path, url: null, failed: true }); }
    };
    refresh();
    // Cached links outlive this check; no request until the link actually expires.
    const timer = setInterval(refresh, 60000);
    return () => { active = false; clearInterval(timer); };
  }, [path, visible]);
  return {
    url: image.path === path ? image.url : cachedFileUrl(path),
    failed: image.path === path && image.failed,
    onError: () => setImage({ path, url: null, failed: true }),
  };
}
