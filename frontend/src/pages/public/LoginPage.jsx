import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Sparkles, Mail, Lock, LogIn, ArrowRight, ShieldCheck, GraduationCap, Calendar } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const redirectByRole = (role) => {
    const from = location.state?.from?.pathname;
    if (from && !from.includes('/login') && !from.includes('/register')) {
      navigate(from, { replace: true });
      return;
    }

    if (role === 'admin') navigate('/admin/dashboard', { replace: true });
    else if (role === 'organizer') navigate('/organizer/dashboard', { replace: true });
    else navigate('/student/dashboard', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await login(email.trim(), password);
      showToast(`Welcome back, ${res.user.name}!`, 'success');
      redirectByRole(res.user.role);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password');
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 1-Click Demo Login
  const handleQuickDemoLogin = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await login(demoEmail, 'password123');
      showToast(`Logged in as ${res.user.role.toUpperCase()}: ${res.user.name}`, 'success');
      redirectByRole(res.user.role);
    } catch (err) {
      setErrorMsg(err.message || 'Demo login failed');
      showToast(err.message || 'Demo login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Brand & Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-200">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome to VoluntSync
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Sign in to access your college volunteer dashboard
          </p>
        </div>

        {/* 1-Click Demo Accounts Box */}
        <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/90 p-4 rounded-2xl border border-indigo-100 shadow-sm space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Quick Demo 1-Click Login
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@college.edu')}
              disabled={submitting}
              className="px-2.5 py-2 bg-white hover:bg-indigo-600 hover:text-white text-slate-700 text-[11px] font-bold rounded-xl border border-slate-200 shadow-xs transition-all flex flex-col items-center gap-1"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600 group-hover:text-white" />
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('organizer@college.edu')}
              disabled={submitting}
              className="px-2.5 py-2 bg-white hover:bg-indigo-600 hover:text-white text-slate-700 text-[11px] font-bold rounded-xl border border-slate-200 shadow-xs transition-all flex flex-col items-center gap-1"
            >
              <Calendar className="w-4 h-4 text-indigo-600 group-hover:text-white" />
              <span>Organizer</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('student@college.edu')}
              disabled={submitting}
              className="px-2.5 py-2 bg-white hover:bg-indigo-600 hover:text-white text-slate-700 text-[11px] font-bold rounded-xl border border-slate-200 shadow-xs transition-all flex flex-col items-center gap-1"
            >
              <GraduationCap className="w-4 h-4 text-sky-600 group-hover:text-white" />
              <span>Student</span>
            </button>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="e.g. student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don't have a student account yet?{' '}
              <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-700">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
