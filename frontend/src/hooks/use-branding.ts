import { useQuery } from "@tanstack/react-query"

import { branding as brandingApi } from "@/lib/api"

/** Platform branding (name, tagline, logo) shown in the admin console and on the platform login page. */
export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    queryFn: brandingApi.get,
    staleTime: 5 * 60 * 1000,
  })
}
