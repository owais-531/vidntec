import Script from 'next/script';

/**
 * Google tag (gtag.js). Loaded with `afterInteractive` (Next's recommended
 * strategy for analytics — after hydration, not blocking first paint).
 * Renders nothing when `NEXT_PUBLIC_GA_ID` is unset (kept unset in local
 * `.env.local`, so dev/testing traffic never reaches the real GA property).
 */
export function GoogleAnalytics({ gaId }: { gaId: string }) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
