import { useState } from "react";

export default function ProgressiveGameImage({ src, preview, alt, className = "", loading }) {
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [failedPreview, setFailedPreview] = useState(null);
  const loaded = loadedSrc === src;

  return (
    <span className={`edge-progressive-image ${className}`} data-loaded={loaded}>
      {!loaded && preview && failedPreview !== preview && (
        <img className="edge-image-preview" src={preview} alt="" loading={loading}
          aria-hidden="true" onError={() => setFailedPreview(preview)} />
      )}
      <img key={src} className="edge-image-full" src={src} alt={alt} loading={loading}
        decoding="async" onLoad={() => setLoadedSrc(src)} />
    </span>
  );
}
