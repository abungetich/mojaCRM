import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Palette } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PageLoader } from "@/components/ui/spinner"
import { useBranding } from "@/hooks/use-branding"
import { branding as brandingApi } from "@/lib/api"
import type { Branding } from "@/types"

const schema = z.object({
  app_name: z.string().min(2, "Name is required"),
  tagline: z.string().optional(),
  logo_url: z.string().optional(),
  icon_url: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const brandingQuery = useBranding()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { app_name: "", tagline: "", logo_url: "", icon_url: "" },
  })

  useEffect(() => {
    if (brandingQuery.data) form.reset(brandingQuery.data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandingQuery.data])

  const updateMutation = useMutation({
    mutationFn: (input: Branding) => brandingApi.update(input),
    onSuccess: () => {
      toast.success("Branding updated")
      queryClient.invalidateQueries({ queryKey: ["branding"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const logoUrl = form.watch("logo_url")
  const iconUrl = form.watch("icon_url")
  const appName = form.watch("app_name")
  const tagline = form.watch("tagline")
  const mark = iconUrl || logoUrl

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Platform", to: "/admin" }, { label: "Settings" }]}
        backTo="/admin"
        title="Platform settings"
        description="Branding shown across the platform admin console and login pages"
      />

      {brandingQuery.isLoading ? (
        <PageLoader label="Loading branding…" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="text-primary size-4" /> Brand
              </CardTitle>
              <CardDescription>Name, tagline, and logo assets for the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((values) => updateMutation.mutate(values as Branding))}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="app_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform name</FormLabel>
                        <FormControl>
                          <Input placeholder="MojaCRM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tagline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagline</FormLabel>
                        <FormControl>
                          <Input placeholder="Platform console" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="logo_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://…/logo.png" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="icon_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icon URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://…/icon.png" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={updateMutation.isPending}>
                    Save branding
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>How this shows up in the sidebar and login screens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                {mark ? (
                  <img src={mark} alt={appName} className="size-9 shrink-0 rounded-xl object-contain" />
                ) : (
                  <div className="brand-mark flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white">
                    {(appName || "MC").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{appName || "MojaCRM"}</div>
                  <div className="text-muted-foreground truncate text-xs">{tagline || "Platform console"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
