import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { CircleAlert, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const { verifyEmail } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    if (!token) {
      setError("This verification link is missing its token.")
      return
    }
    verifyEmail(token)
      .then(() => navigate("/", { replace: true }))
      .catch((err) => setError(err instanceof Error ? err.message : "Verification failed"))
  }, [token, verifyEmail, navigate])

  return (
    <div className="bg-muted/30 flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div
            className={
              error
                ? "bg-destructive/10 text-destructive mb-2 flex size-10 items-center justify-center rounded-xl"
                : "bg-primary text-primary-foreground mb-2 flex size-10 items-center justify-center rounded-xl"
            }
          >
            {error ? <CircleAlert className="size-5" /> : <ShieldCheck className="size-5" />}
          </div>
          <CardTitle>{error ? "Verification failed" : "Verifying your email…"}</CardTitle>
          <CardDescription>
            {error ?? "Hang tight, we're activating your workspace."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-muted-foreground text-center text-sm">
              <Link to="/signup" className="text-primary underline-offset-4 hover:underline">
                Sign up again
              </Link>{" "}
              or{" "}
              <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                sign in
              </Link>
              .
            </p>
          ) : (
            <Skeleton className="h-9 w-full" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
