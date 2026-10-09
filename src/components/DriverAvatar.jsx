import { useState, useEffect } from 'react';
import { fileUrl } from '../services/fileService';
export default function DriverAvatar({ driver, large = false }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let active = true;
    const refresh = () => fileUrl(driver.profile_photo).then(value => { if (active) setUrl(value); }).catch(() => { if (active) setUrl(null); });
    refresh();
    const timer = setInterval(refresh, 240000);
    return () => { active = false; clearInterval(timer); };
  }, [driver.profile_photo]);
  const size = large ? 'h-20 w-20 text-3xl ring-4 ring-white shadow-sm' : 'h-16 w-16 text-xl';
  return url ? <img src={url} alt={`${driver.name} profile`} className={`${size} rounded-full object-cover shrink-0`} onError={() => setUrl(null)} /> : <span className={`${size} rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold shrink-0`}>{driver.name?.slice(0, 1).toUpperCase()}</span>;
}
