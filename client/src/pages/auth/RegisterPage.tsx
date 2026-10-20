import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Building2, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/useToast'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  accountType: z.enum(['BUSINESS_OWNER', 'COLLABORATOR']),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { register: authRegister } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      accountType: 'BUSINESS_OWNER',
    },
  })

  // Prevent browser password managers from auto-filling saved admin/owner credentials into new registration form
  useEffect(() => {
    const clearInjectedCredentials = () => {
      setValue('username', '')
      setValue('email', '')
      setValue('password', '')
      setValue('confirmPassword', '')

      const usernameEl = document.getElementById('register-username') as HTMLInputElement | null
      const emailEl = document.getElementById('register-email') as HTMLInputElement | null
      const passwordEl = document.getElementById('register-password') as HTMLInputElement | null
      const confirmEl = document.getElementById('register-confirm-password') as HTMLInputElement | null

      if (usernameEl && (usernameEl.value === 'owner@aeva.com' || usernameEl.value.includes('@'))) {
        usernameEl.value = ''
      }
      if (emailEl && emailEl.value === 'owner@aeva.com') {
        emailEl.value = ''
      }
      if (passwordEl && (passwordEl.value === 'Password@123' || passwordEl.value.length > 0)) {
        passwordEl.value = ''
      }
      if (confirmEl) {
        confirmEl.value = ''
      }
    }

    clearInjectedCredentials()
    const t1 = setTimeout(clearInjectedCredentials, 60)
    const t2 = setTimeout(clearInjectedCredentials, 250)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [setValue])

  const accountType = watch('accountType')

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      await authRegister({
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        password: data.password,
        phone: data.phone,
        accountType: data.accountType,
      })
      navigate('/', { replace: true })
    } catch (err: any) {
      toast({
        title: 'Registration failed',
        description: err.response?.data?.message || 'Unable to create account',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-wider">AEVA</span>
        </div>

        <h2 className="text-3xl font-bold mb-2">Create your account</h2>
        <p className="text-muted-foreground mb-8">
          Join AEVA to manage your multi-brand business operations
        </p>

        {/* Account type selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { type: 'BUSINESS_OWNER', label: 'Business Owner', desc: 'Manage brands, teams & finances' },
            { type: 'COLLABORATOR', label: 'Collaborator', desc: 'Join businesses as team/vendor' },
          ].map(({ type, label, desc }) => (
            <label
              key={type}
              className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                accountType === type
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <input
                type="radio"
                value={type}
                {...register('accountType')}
                className="sr-only"
              />
              <div className="font-medium text-sm">{label}</div>
              <div className="text-xs text-muted-foreground mt-1">{desc}</div>
            </label>
          ))}
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        >
          {/* Hidden honeypot inputs to capture browser autofill heuristics */}
          <div style={{ display: 'none', position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
            <input type="text" name="chrome_prevent_autofill_user" tabIndex={-1} autoComplete="username" />
            <input type="password" name="chrome_prevent_autofill_pwd" tabIndex={-1} autoComplete="current-password" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="register-fullName">Full Name</label>
              <Input
                id="register-fullName"
                placeholder="John Doe"
                autoComplete="off"
                {...register('fullName')}
              />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="register-username">Username</label>
              <Input
                id="register-username"
                placeholder="john_doe"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                {...register('username')}
              />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="register-email">Email</label>
            <Input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="off"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="register-phone">Phone <span className="text-muted-foreground">(optional)</span></label>
            <Input
              id="register-phone"
              type="tel"
              placeholder="+91 98765 43210"
              autoComplete="off"
              {...register('phone')}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="register-password">Password</label>
            <div className="relative">
              <Input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="register-confirm-password">Confirm Password</label>
            <Input
              id="register-confirm-password"
              type="password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>

        <div className="text-center mt-6 text-xs text-muted-foreground">
          Made with <span className="text-red-500">❤️</span> by <span className="font-semibold text-foreground">Shivam Chaurasia</span>
        </div>
      </div>
    </div>
  )
}
