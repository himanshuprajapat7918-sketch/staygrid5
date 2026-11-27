import { useState } from 'react';
import { Building2 } from 'lucide-react';

interface ResilientImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export default function ResilientImage({
  src,
  alt,
  className = 'h-full w-full object-cover',
  fallbackLabel = 'Room Preview',
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/70 p-4 text-center"
      >
        <Building2 className="h-7 w-7 text-slate-400" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-500">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
