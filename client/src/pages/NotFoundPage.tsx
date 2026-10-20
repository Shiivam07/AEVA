import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
          404
        </div>
        <h1 className="text-2xl font-bold mt-4 tracking-tight">Page Not Found</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          The page you are looking for doesn't exist, has been removed, or you don't have permission to access it.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
          <Button asChild className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" /> Home Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
