import { useEffect, useState } from 'react';
import { usePrivateImage, useVisible } from '../hooks/usePrivateImage';
import { ensureDriverThumbnail } from '../services/fileService';

export default function DriverAvatar({ driver, large = false }) {
  const { ref, visible } = useVisible();
  const [prepared, setPrepared] = useState(null);
  const thumbnail = driver.profile_thumbnail || (prepared?.photo === driver.profile_photo ? prepared.path : null);
  const { url, onError } = usePrivateImage(thumbnail || driver.profile_photo, visible);
  useEffect(() => {
    if (!visible || thumbnail || !driver.profile_photo) return;
    let active = true;
    ensureDriverThumbnail(driver).then(updated => {
      if (active && updated.profile_thumbnail) setPrepared({ photo: driver.profile_photo, path: updated.profile_thumbnail });
    }).catch(() => { /* Original remains available if thumbnail setup is pending. */ });
    return () => { active = false; };
  }, [driver, visible, thumbnail]);
  const size = large ? 'h-20 w-20 text-3xl ring-4 ring-white shadow-sm' : 'h-16 w-16 text-xl';
  return <span ref={ref} className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-bold text-blue-800`}>
    {url ? <img src={url} alt={`${driver.name} profile`} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={onError} /> : driver.name?.slice(0, 1).toUpperCase()}
  </span>;
}
