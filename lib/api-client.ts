// lib/api-client.ts

/**
 * Helper function to ensure API calls point to the correct backend.
 * In a standard web environment, this resolves to a relative path ("/api/...").
 * In a static export (Capacitor mobile app), it resolves to the hosted backend URL.
 */
export function getApiUrl(endpoint: string): string {
  // NEXT_PUBLIC_API_URL should be set in your .env.local when building the mobile app.
  // e.g. NEXT_PUBLIC_API_URL="https://your-vercel-domain.vercel.app"
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  
  // Ensure we don't have double slashes if endpoint already starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${baseUrl}${cleanEndpoint}`;
}
