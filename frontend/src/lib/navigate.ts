// Waze deep-linking with graceful fallback to Google Maps / install Waze.

export const wazeWebUrl = (lat: number, lng: number) =>
  `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

export const googleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export const WAZE_STORE = {
  ios: "https://apps.apple.com/app/id323229106",
  android: "https://play.google.com/store/apps/details?id=com.waze",
};

export const platform = (): "ios" | "android" | "desktop" => {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document)) return "ios";
  return "desktop";
};

/**
 * Try to open Waze. Calls onFallback() if the app did not take over
 * within ~1.6s (i.e. Waze is probably not installed).
 */
export function openInWaze(lat: number, lng: number, onFallback: () => void) {
  const p = platform();
  if (p === "desktop") {
    window.open(wazeWebUrl(lat, lng), "_blank", "noopener");
    return;
  }

  let leftPage = false;
  const onHide = () => {
    if (document.hidden) leftPage = true;
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);

  if (p === "android") {
    // Android intent: opens Waze if installed, otherwise Chrome follows the fallback URL (Google Maps)
    const fallback = encodeURIComponent(googleMapsUrl(lat, lng));
    window.location.href =
      `intent://?ll=${lat},${lng}&navigate=yes#Intent;scheme=waze;package=com.waze;` +
      `S.browser_fallback_url=${fallback};end`;
  } else {
    window.location.href = `waze://?ll=${lat},${lng}&navigate=yes`;
  }

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
    if (!leftPage && !document.hidden) onFallback();
  }, 1600);
}
