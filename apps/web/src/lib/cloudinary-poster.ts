/**
 * Turn a Cloudinary video URL into a still poster image (first frame).
 *
 *   .../video/upload/v123/vidntec/products/clip.mp4
 *   → .../video/upload/so_0/v123/vidntec/products/clip.jpg
 *
 * `so_0` = "start offset 0s"; swapping the extension to .jpg asks Cloudinary to
 * deliver that frame as an image. Used for gallery/manager video thumbnails so we
 * never ship a second uploaded file. Non-Cloudinary or already-image URLs are
 * returned unchanged.
 */
export function posterUrl(videoUrl: string): string {
  if (!videoUrl.includes('/video/upload/')) return videoUrl;
  return videoUrl
    .replace('/video/upload/', '/video/upload/so_0/')
    .replace(/\.(mp4|mov|webm|m4v|ogv|avi|mkv)(\?.*)?$/i, '.jpg$2');
}
