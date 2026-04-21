'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, Sparkles, Mail, Lock, User, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const result = await signIn('credentials', { email, password, redirect: false });
        if (result?.error) {
          setError(result.error);
        } else {
          router.push('/');
          router.refresh();
        }
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Registration failed');
        } else {
          const result = await signIn('credentials', { email, password, redirect: false });
          if (result?.error) {
            setError('Account created but login failed. Please try logging in.');
            setIsLogin(true);
          } else {
            router.push('/');
            router.refresh();
          }
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch {
      setError('Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#0e0e0f' }}>
      {/* Left side — Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #0e0e0f 0%, #1a0a05 60%, #0e0e0f 100%)' }}>
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f05a28] to-[#e03020] flex items-center justify-center shadow-xl shadow-orange-700/40 border-2 border-black/30">
                <Zap className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center border border-black/20">
                <Sparkles className="h-2.5 w-2.5 text-[#f05a28]" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-black text-white tracking-tight">SolarisAI</span>
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-orange-500/50">by terraGravity</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-black text-white leading-tight">
            Your AI companion for<br />
            <span style={{ background: 'linear-gradient(135deg, #f05a28, #ff8c5a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              productive conversations
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-md">
            Chat with an intelligent assistant that remembers your context, saves your ideas, and helps you stay organized.
          </p>
          <div className="flex flex-wrap gap-3 pt-4">
            {['Contextual Memory', 'Cloud Storage', 'Multi-mode Chat', 'Project Management'].map((feature) => (
              <span key={feature}
                className="px-3 py-1.5 rounded-full text-sm text-gray-300 border"
                style={{ background: 'rgba(240,90,40,0.08)', borderColor: 'rgba(240,90,40,0.2)' }}>
                {feature}
              </span>
            ))}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          © 2026 terraGravity · SolarisAI. All rights reserved.
        </div>
      </div>

      {/* Right side — Form */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: '#141416' }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f05a28] to-[#e03020] flex items-center justify-center border border-black/20">
              <Zap className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="text-xl font-black text-white">SolarisAI</span>
              <p className="text-[9px] font-bold tracking-widest uppercase text-orange-500/50">by terraGravity</p>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-gray-400">
              {isLogin ? 'Sign in to continue to SolarisAI' : 'Get started with SolarisAI today'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required={!isLogin}
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all border-2"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#f05a28'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  placeholder="Your name" />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all border-2"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#f05a28'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                placeholder="you@example.com" />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                className="w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all border-2"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#f05a28'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                placeholder="••••••••" />
            </div>

            {!isLogin && <p className="text-xs text-gray-500">Password must be at least 8 characters</p>}

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl text-sm border"
                style={{ background: 'rgba(224,48,32,0.1)', borderColor: 'rgba(224,48,32,0.3)', color: '#ff8070' }}>
                {error}
              </motion.div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 px-4 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-black/20 text-white disabled:cursor-not-allowed"
              style={{
                background: loading ? 'rgba(240,90,40,0.5)' : 'linear-gradient(135deg, #f05a28, #e03020)',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(240,90,40,0.3)',
              }}>
              {loading ? <><Loader2 className="h-5 w-5 animate-spin" />Please wait...</> : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 text-gray-500" style={{ background: '#141416' }}>or continue with</span>
            </div>
          </div>

          {/* Google Sign-In */}
          <button onClick={handleGoogleSignIn} disabled={googleLoading}
            className="w-full py-3 px-4 bg-white hover:bg-gray-50 border-2 border-black/10 rounded-xl text-gray-700 font-medium transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
            {googleLoading ? (
              <><Loader2 className="h-5 w-5 animate-spin" />Connecting...</>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-gray-400 hover:text-white text-sm transition-colors">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span className="font-medium" style={{ color: '#f05a28' }}>
                {isLogin ? 'Sign up' : 'Sign in'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
