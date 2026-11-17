import { ImageOff } from "lucide-react";

import { usePhotoSrcs } from "@/lib/photo-store";

/** Shows a job photo whether it is saved in the photo store or inside the job itself. */
export function StoredPhoto({
  photo,
  alt,
  className,
}: {
  photo: string;
  alt: string;
  className?: string;
}) {
  const [src] = usePhotoSrcs([photo]);
  if (!src)
    return (
      <span
        className={`flex items-center justify-center bg-secondary text-muted-foreground ${className ?? ""}`}
      >
        <ImageOff className="size-5" aria-label={alt} />
      </span>
    );
  return <img src={src} alt={alt} className={className} />;
}
