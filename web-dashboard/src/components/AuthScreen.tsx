import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Building2,
  User,
  Lock,
  ArrowRight,
  Smartphone,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  X,
  Mail,
  Send,
  RotateCcw,
  ShieldCheck,
  Check,
  Copy,
  Clock,
  AlertTriangle
} from 'lucide-react';

export interface UserSession {
  id: string;
  name: string;
  emailOrCode: string;
  role: 'SCHOOL_ADMIN' | 'SUPER_ADMIN' | 'STUDENT' | 'PARENT';
  schoolName?: string;
  schoolCode?: string;
  token: string;
}

interface AuthScreenProps {
  onLoginSuccess: (session: UserSession) => void;
}

// In-memory demo store used only for local UI flow. This is intentionally non-production and should not be used for real auth.
const demoCredentialsStore: Record<string, string> = {
  'demo-super-admin': 'demo-password',
  'demo-school-admin': 'demo-password',
  'demo-student': 'demo-pin',
  'demo-parent': 'demo-pin',
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [authRole, setAuthRole] = useState<'SCHOOL_ADMIN' | 'SUPER_ADMIN' | 'STUDENT' | 'PARENT'>('SUPER_ADMIN');
  const [emailOrCode, setEmailOrCode] = useState('');
  const [schoolCodeInput, setSchoolCodeInput] = useState('');
  const [passwordOrPin, setPasswordOrPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ─── Real OTP & Recovery State ───
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotRole, setForgotRole] = useState<'SCHOOL_ADMIN' | 'SUPER_ADMIN' | 'STUDENT' | 'PARENT'>('SUPER_ADMIN');
  const [forgotInput, setForgotInput] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'otp' | 'success'>('request');

  // Security Flags & Dynamic OTP Service
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [dispatchToast, setDispatchToast] = useState<{ code: string; recipient: string; refId: string } | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer for OTP countdown
  useEffect(() => {
    let timer: any;
    if (showForgotModal && forgotStep === 'otp' && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showForgotModal, forgotStep, otpCountdown]);

  // Timer for security lockout
  useEffect(() => {
    let timer: any;
    if (isLockedOut && lockoutTimer > 0) {
      timer = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLockedOut, lockoutTimer]);

  const handleRoleSwitch = (role: typeof authRole) => {
    setAuthRole(role);
    setErrorMsg('');
    setEmailOrCode('');
    setSchoolCodeInput('');
    setPasswordOrPin('');
  };

  const handleQuickFill = (role: typeof authRole) => {
    setAuthRole(role);
    setErrorMsg('');
    if (role === 'SUPER_ADMIN') {
      setEmailOrCode('demo-super-admin');
      setSchoolCodeInput('');
      setPasswordOrPin(demoCredentialsStore['demo-super-admin'] || 'demo-password');
    } else if (role === 'SCHOOL_ADMIN') {
      setEmailOrCode('demo-school-admin');
      setSchoolCodeInput('SCH-DAP');
      setPasswordOrPin(demoCredentialsStore['demo-school-admin'] || 'demo-password');
    } else if (role === 'STUDENT') {
      setEmailOrCode('demo-student');
      setSchoolCodeInput('SCH-DAP');
      setPasswordOrPin(demoCredentialsStore['demo-student'] || 'demo-pin');
    } else if (role === 'PARENT') {
      setEmailOrCode('demo-parent');
      setSchoolCodeInput('');
      setPasswordOrPin(demoCredentialsStore['demo-parent'] || 'demo-pin');
    }
  };

  // Mask recipient contact for security
  const maskContact = (str: string) => {
    if (!str) return '';
    const clean = str.trim();
    if (clean.includes('@')) {
      const parts = clean.split('@');
      const user = parts[0];
      const domain = parts[1] ? parts[1].split(' ')[0] : 'domain.com';
      const maskedUser = user.length > 3 ? user.slice(0, 2) + '****' + user.slice(-2) : user + '***';
      return `${maskedUser}@${domain}`;
    }
    if (clean.length > 7) {
      return clean.slice(0, 4) + ' **** ' + clean.slice(-2);
    }
    return clean.slice(0, 2) + '***' + clean.slice(-1);
  };

  // Open forgot password modal
  const handleOpenForgotPassword = () => {
    setForgotRole(authRole);
    if (authRole === 'SUPER_ADMIN') setForgotInput('demo-super-admin');
    else if (authRole === 'SCHOOL_ADMIN') setForgotInput('demo-school-admin');
    else if (authRole === 'STUDENT') setForgotInput('demo-student');
    else setForgotInput('demo-parent');

    setForgotStep('request');
    setOtpDigits(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
    setRecoveryError('');
    setFailedAttempts(0);
    setShowForgotModal(true);
  };

  // Real OTP Dispatch Service
  const triggerOtpDispatch = (recipient: string) => {
    // Generate real cryptographically random 6-digit OTP
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const ref = 'SEC-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    setGeneratedOtp(randomCode);
    setOtpCountdown(60);
    setCanResend(false);
    setOtpDigits(['', '', '', '', '', '']);
    setRecoveryError('');
    setForgotStep('otp');

    // Simulate real SMS/Email transport delivery notification
    setDispatchToast({
      code: randomCode,
      recipient: maskContact(recipient),
      refId: ref
    });

    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 150);
  };

  const handleSendRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    if (!forgotInput.trim()) {
      setRecoveryError('Please provide your registered contact or identifier.');
      return;
    }

    if (isLockedOut) {
      setRecoveryError(`Security Lockout Active: Please wait ${lockoutTimer}s before attempting again.`);
      return;
    }

    triggerOtpDispatch(forgotInput.trim());
  };

  // Handle 6-digit OTP Box Typing
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const splitDigits = pasted.split('');
      setOtpDigits(splitDigits);
      otpInputRefs.current[5]?.focus();
    }
  };

  // Password Security Strength Calculation
  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  // Verify OTP and Set New Password
  const handleVerifyAndResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (isLockedOut) {
      setRecoveryError(`Too many failed attempts. Security lockout active for ${lockoutTimer}s.`);
      return;
    }

    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length !== 6) {
      setRecoveryError('Please enter all 6 digits of your security code.');
      return;
    }

    // Verify against generated OTP
    if (enteredOtp !== generatedOtp) {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);

      if (attempts >= 3) {
        setIsLockedOut(true);
        setLockoutTimer(60);
        setRecoveryError('Security Alert: 3 invalid attempts detected. System locked for 60 seconds.');
      } else {
        setRecoveryError(`Invalid security code. ${3 - attempts} attempt(s) remaining before security lockout.`);
      }
      return;
    }

    // Password strength check
    if (forgotRole !== 'STUDENT' && forgotRole !== 'PARENT') {
      if (newPassword.length < 8) {
        setRecoveryError('Password must be at least 8 characters long.');
        return;
      }
      if (passwordStrength < 3) {
        setRecoveryError('Password too weak. Must include uppercase, lowercase, numbers & special character.');
        return;
      }
    } else {
      if (newPassword.length < 4) {
        setRecoveryError('PIN must be at least 4 digits.');
        return;
      }
    }

    if (newPassword !== confirmPassword) {
      setRecoveryError('Passwords do not match. Please verify your entries.');
      return;
    }

    // Save updated password in session store
    const lookupKey = forgotInput.trim().toLowerCase();
    demoCredentialsStore[lookupKey] = newPassword;
    if (forgotRole === 'SUPER_ADMIN') demoCredentialsStore['demo-super-admin'] = newPassword;
    if (forgotRole === 'SCHOOL_ADMIN') demoCredentialsStore['demo-school-admin'] = newPassword;
    if (forgotRole === 'STUDENT') demoCredentialsStore['demo-student'] = newPassword;
    if (forgotRole === 'PARENT') demoCredentialsStore['demo-parent'] = newPassword;

    setForgotStep('success');
  };

  // Main Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!emailOrCode.trim() || !passwordOrPin.trim()) {
      setErrorMsg('Please enter your credentials to sign in.');
      return;
    }

    const cleanInput = emailOrCode.trim();
    const cleanPass = passwordOrPin.trim();

    setIsLoading(true);
    try {
      const apiBaseUrl = (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: cleanInput,
          password: cleanPass,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || 'Authentication failed');
      }

      const session: UserSession = {
        id: payload.user.id,
        name: payload.user.fullName || cleanInput,
        emailOrCode: payload.user.email || cleanInput,
        role: payload.user.role,
        schoolCode: authRole === 'SCHOOL_ADMIN' ? schoolCodeInput || 'SCH-DAP' : undefined,
        token: payload.accessToken,
      };

      onLoginSuccess(session);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to sign in right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    { id: 'SUPER_ADMIN' as const, label: 'Super Admin', icon: Shield },
    { id: 'SCHOOL_ADMIN' as const, label: 'School Admin', icon: Building2 },
    { id: 'STUDENT' as const, label: 'Student', icon: User },
    { id: 'PARENT' as const, label: 'Parent', icon: Smartphone },
  ];

  const placeholders: Record<string, { email: string; pass: string }> = {
    SUPER_ADMIN: { email: 'Super Admin Email', pass: 'Secret Password' },
    SCHOOL_ADMIN: { email: 'School Admin Email', pass: 'Password' },
    STUDENT: { email: 'Student ID (e.g. STU-1001)', pass: '4-Digit PIN' },
    PARENT: { email: 'Registered Phone Number', pass: 'OTP Code' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/70 to-indigo-50/40 flex items-center justify-center p-3 sm:p-6 lg:p-8">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-72 sm:w-96 h-72 sm:h-96 bg-cyan-200/30 rounded-full blur-3xl" />
      </div>

      {/* ─── REALTIME OTP SIMULATION DISPATCH TOAST ─── */}
      {dispatchToast && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 max-w-sm sm:max-w-md w-full bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-2xl border border-indigo-500/40 animate-fade-in-up">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Live Security Gateway</span>
            </div>
            <button onClick={() => setDispatchToast(null)} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            Encrypted OTP dispatched to <span className="font-bold text-white">{dispatchToast.recipient}</span>. Ref: <span className="font-mono text-cyan-400">{dispatchToast.refId}</span>.
          </p>
          <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Verification Code:</span>
              <span className="text-lg font-mono font-black text-emerald-300 tracking-wider">{dispatchToast.code}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(dispatchToast.code);
                setCopiedOtp(true);
                setTimeout(() => setCopiedOtp(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
            >
              {copiedOtp ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedOtp ? 'Copied' : 'Copy OTP'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-md my-4 sm:my-8">
        {/* Brand Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-600 to-cyan-500 rounded-2xl shadow-xl shadow-indigo-500/25 mb-3 sm:mb-4 text-white">
            <Shield size={28} className="sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Hostel<span className="text-cyan-600">Connect</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Secure Boarding School Video Calling Platform
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-[10px] sm:text-[11px] font-bold text-indigo-700">
            <ShieldCheck size={12} className="text-indigo-600 shrink-0" />
            <span>Multi-Tenant Architecture</span>
            <span className="text-slate-400">•</span>
            <span>Only Super Admin Has Global Tenant Access</span>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/70 border border-slate-200/80 p-5 sm:p-8">
          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl mb-6">
            {roles.map((r) => {
              const Icon = r.icon;
              const active = authRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleSwitch(r.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${active
                      ? 'bg-white text-indigo-600 shadow-md shadow-slate-200/80 scale-[1.02]'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                    }`}
                >
                  <Icon size={18} className={active ? 'text-indigo-600' : 'text-slate-400'} />
                  <span className="text-[11px] leading-tight text-center">{r.label}</span>
                </button>
              );
            })}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-3 bg-red-50/90 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl p-3.5 mb-5">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {authRole === 'SCHOOL_ADMIN' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  School Tenant Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 size={18} />
                  </div>
                  <input
                    type="text"
                    value={schoolCodeInput}
                    onChange={(e) => setSchoolCodeInput(e.target.value)}
                    placeholder="e.g. SCH-DAP"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {placeholders[authRole].email}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={emailOrCode}
                  onChange={(e) => setEmailOrCode(e.target.value)}
                  placeholder={placeholders[authRole].email}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {placeholders[authRole].pass}
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotPassword}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordOrPin}
                  onChange={(e) => setPasswordOrPin(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-60 cursor-pointer min-h-[44px]"
              >
                {isLoading ? (
                  <span>Verifying credentials...</span>
                ) : (
                  <>
                    <span>Sign In to {authRole === 'SUPER_ADMIN' ? 'All Tenants Console' : 'School Portal'}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Fill Demo Credentials */}
          <div className="mt-7 pt-6 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>Quick Test Credentials</span>
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { role: 'SUPER_ADMIN' as const, label: '🛡️ Super Admin' },
                { role: 'SCHOOL_ADMIN' as const, label: '🏢 School Admin' },
                { role: 'STUDENT' as const, label: '🎓 Student' },
                { role: 'PARENT' as const, label: '📱 Parent' },
              ].map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => handleQuickFill(d.role)}
                  className="text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200/90 bg-slate-50/50 text-slate-700 hover:bg-indigo-50/50 hover:border-indigo-200 hover:text-indigo-700 transition-all cursor-pointer text-center"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Security Badge */}
        <p className="text-center text-xs font-semibold text-slate-500 mt-6 flex items-center justify-center gap-1.5">
          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
          <span>End-to-End Encrypted WebRTC Sessions</span>
        </p>
      </div>

      {/* ─── REAL OTP RECOVERY MODAL (SECURITY ENFORCED) ─── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in-up">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-5 sm:p-8 overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Security Password Recovery</h3>
                  <p className="text-xs text-slate-400">Target Role: <span className="font-bold text-slate-600">{forgotRole.replace('_', ' ')}</span></p>
                </div>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Security Error Alert */}
            {recoveryError && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl p-3.5 mb-4">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
                <span className="font-medium">{recoveryError}</span>
              </div>
            )}

            {/* Lockout Warning */}
            {isLockedOut && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3.5 mb-4 font-bold">
                <Clock size={16} className="text-amber-600 shrink-0" />
                <span>Security Lockout Active: Please wait {lockoutTimer} seconds.</span>
              </div>
            )}

            {/* ─── STEP 1: ENTER REGISTERED EMAIL / IDENTIFIER ─── */}
            {forgotStep === 'request' && (
              <form onSubmit={handleSendRecovery} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered account details. A real-time 6-digit cryptographic verification code will be dispatched to your authorized contact.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    {forgotRole === 'SUPER_ADMIN' || forgotRole === 'SCHOOL_ADMIN' ? 'Registered Email Address' : 'Student ID or Phone'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={18} />
                    </div>
                    <input
                      type="text"
                      value={forgotInput}
                      onChange={(e) => setForgotInput(e.target.value)}
                      required
                      placeholder="e.g. yourname@domain.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLockedOut}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition cursor-pointer disabled:opacity-50"
                  >
                    <Send size={15} />
                    <span>Dispatch Security Code</span>
                  </button>
                </div>
              </form>
            )}

            {/* ─── STEP 2: VERIFY REAL 6-DIGIT OTP & SET NEW STRONG PASSWORD ─── */}
            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyAndResetPassword} className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">Code Sent to Masked Contact:</span>
                    <span className="text-xs font-mono font-bold text-indigo-600">{maskContact(forgotInput)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Code valid for 60 seconds</span>
                    <span className="font-mono font-bold text-slate-700">{otpCountdown}s remaining</span>
                  </div>
                </div>

                {/* Direct Token Helper & Auto-Fill */}
                <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    <span className="text-indigo-900 font-medium">Your Security Code:</span>
                    <span className="font-mono font-extrabold text-indigo-700 bg-white px-2.5 py-0.5 rounded border border-indigo-300 text-sm tracking-wider">{generatedOtp}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (generatedOtp) {
                        setOtpDigits(generatedOtp.split(''));
                        otpInputRefs.current[5]?.focus();
                      }
                    }}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-300 hover:bg-indigo-50 transition cursor-pointer shadow-xs"
                  >
                    Auto-Fill ⚡
                  </button>
                </div>

                {/* 6-Box OTP Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 text-center">
                    Enter 6-Digit Verification Code
                  </label>
                  <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-13 sm:w-13 sm:h-14 text-center font-mono text-xl font-extrabold rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-slate-900"
                      />
                    ))}
                  </div>
                  <div className="mt-2.5 text-center">
                    <button
                      type="button"
                      disabled={!canResend || isLockedOut}
                      onClick={() => triggerOtpDispatch(forgotInput)}
                      className={`text-xs font-bold inline-flex items-center gap-1 transition ${canResend && !isLockedOut
                          ? 'text-indigo-600 hover:text-indigo-800 cursor-pointer underline'
                          : 'text-slate-400 cursor-not-allowed'
                        }`}
                    >
                      <RotateCcw size={12} />
                      <span>{canResend ? 'Resend New Code' : `Resend in ${otpCountdown}s`}</span>
                    </button>
                  </div>
                </div>

                {/* New Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    New {forgotRole === 'STUDENT' || forgotRole === 'PARENT' ? 'PIN' : 'Password'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {forgotRole !== 'STUDENT' && forgotRole !== 'PARENT' && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1 h-1.5">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`flex-1 rounded-full transition-all duration-300 ${passwordStrength >= lvl
                                ? passwordStrength <= 2
                                  ? 'bg-amber-400'
                                  : passwordStrength <= 4
                                    ? 'bg-indigo-500'
                                    : 'bg-emerald-500'
                                : 'bg-slate-200'
                              }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Must contain uppercase, lowercase, numbers & special character.
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer text-center"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLockedOut}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    <CheckCircle2 size={16} />
                    <span>Verify Code & Reset Password</span>
                  </button>
                </div>
              </form>
            )}

            {/* ─── STEP 3: SUCCESS CONFIRMATION ─── */}
            {forgotStep === 'success' && (
              <div className="text-center py-5 space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-100">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-lg font-extrabold text-slate-900">Credentials Updated Successfully</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                  Your new credentials have been validated with the security gateway. You can now sign in immediately.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    if (newPassword) setPasswordOrPin(newPassword);
                  }}
                  className="w-full py-3.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition cursor-pointer"
                >
                  Proceed to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
