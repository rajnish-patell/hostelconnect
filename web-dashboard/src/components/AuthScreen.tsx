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
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';

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

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [authRole, setAuthRole] = useState<'SCHOOL_ADMIN' | 'SUPER_ADMIN' | 'STUDENT' | 'PARENT'>('SUPER_ADMIN');
  const [emailOrCode, setEmailOrCode] = useState('patelrajnish47@gmail.com');
  const [schoolCodeInput, setSchoolCodeInput] = useState('');
  const [passwordOrPin, setPasswordOrPin] = useState('HostelConnect@2026');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ─── Secure 4-Step Password Recovery State ───
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotRole, setForgotRole] = useState<'SCHOOL_ADMIN' | 'SUPER_ADMIN' | 'STUDENT' | 'PARENT'>('SUPER_ADMIN');
  const [forgotInput, setForgotInput] = useState('patelrajnish47@gmail.com');
  const [maskedRecipient, setMaskedRecipient] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'otp' | 'password' | 'success'>('request');
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);

  // Verification & Temporary Authorization Token
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resetAuthToken, setResetAuthToken] = useState<string>('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [dispatchToast, setDispatchToast] = useState<{ recipient: string } | null>(null);

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
    if (role === 'SUPER_ADMIN') {
      setEmailOrCode('patelrajnish47@gmail.com');
      setSchoolCodeInput('');
      setPasswordOrPin('HostelConnect@2026');
    } else if (role === 'SCHOOL_ADMIN') {
      setEmailOrCode('admin@dps.edu.in');
      setSchoolCodeInput('SCH-DAP');
      setPasswordOrPin('HostelConnect@2026');
    } else if (role === 'STUDENT') {
      setEmailOrCode('STU-1001');
      setSchoolCodeInput('SCH-DAP');
      setPasswordOrPin('4819');
    } else if (role === 'PARENT') {
      setEmailOrCode('+919876543210');
      setSchoolCodeInput('');
      setPasswordOrPin('HostelConnect@2026');
    }
  };

  const handleQuickFill = (role: typeof authRole) => {
    handleRoleSwitch(role);
  };

  // Open forgot password modal
  const handleOpenForgotPassword = () => {
    setForgotRole(authRole);
    if (authRole === 'SUPER_ADMIN') setForgotInput('patelrajnish47@gmail.com');
    else if (authRole === 'SCHOOL_ADMIN') setForgotInput('admin@dps.edu.in');
    else if (authRole === 'STUDENT') setForgotInput('student@dps.edu.in');
    else setForgotInput('patelrajnish47@gmail.com');

    setForgotStep('request');
    setOtpDigits(['', '', '', '', '', '']);
    setResetAuthToken('');
    setNewPassword('');
    setConfirmPassword('');
    setRecoveryError('');
    setFailedAttempts(0);
    setShowForgotModal(true);
  };

  // Step 1: Send Recovery Email via Backend API
  const handleSendRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    const cleanEmail = forgotInput.trim();
    if (!cleanEmail) {
      setRecoveryError('Please provide your registered email address.');
      return;
    }

    if (isLockedOut) {
      setRecoveryError(`Security Lockout Active: Please wait ${lockoutTimer}s before attempting again.`);
      return;
    }

    setIsRecoveryLoading(true);
    try {
      const res = await api.auth.forgotPassword(cleanEmail);
      setMaskedRecipient(res.recipient || cleanEmail);
      setOtpCountdown(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setForgotStep('otp');

      setDispatchToast({
        recipient: res.recipient || cleanEmail,
      });

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 200);
    } catch (err: any) {
      setRecoveryError(err.message || 'Unable to send verification code. Please try again.');
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  // Handle 6-digit OTP Box Typing
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

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

  // Step 2: Verify OTP via Backend API
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (isLockedOut) {
      setRecoveryError(`Too many failed attempts. Security lockout active for ${lockoutTimer}s.`);
      return;
    }

    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length !== 6) {
      setRecoveryError('Please enter all 6 digits of your security code from your email.');
      return;
    }

    setIsRecoveryLoading(true);
    try {
      const res = await api.auth.verifyOtp(forgotInput.trim(), enteredOtp);
      if (res.resetToken) {
        setResetAuthToken(res.resetToken);
        setForgotStep('password');
      } else {
        throw new Error('Invalid verification session.');
      }
    } catch (err: any) {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);

      if (attempts >= 5) {
        setIsLockedOut(true);
        setLockoutTimer(60);
        setRecoveryError('Security Alert: 5 invalid attempts detected. Security lockout active for 60 seconds.');
      } else {
        setRecoveryError(err.message || `Invalid verification code. ${5 - attempts} attempt(s) remaining.`);
      }
    } finally {
      setIsRecoveryLoading(false);
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

  // Step 3: Update Password via Backend API
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (newPassword.length < 8) {
      setRecoveryError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setRecoveryError('Password must contain at least one uppercase letter (A-Z).');
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setRecoveryError('Password must contain at least one lowercase letter (a-z).');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setRecoveryError('Password must contain at least one number (0-9).');
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setRecoveryError('Password must contain at least one special character (e.g. !@#$%^&*).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setRecoveryError('Passwords do not match. Please verify your entry.');
      return;
    }

    setIsRecoveryLoading(true);
    try {
      await api.auth.resetPassword(forgotInput.trim(), resetAuthToken, newPassword);
      setPasswordOrPin(newPassword);
      setResetAuthToken('');
      setForgotStep('success');
    } catch (err: any) {
      setRecoveryError(err.message || 'Unable to update password. Please request a new code.');
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  // Main Login Handler via Backend API
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
      const res = await api.auth.login(cleanInput, cleanPass);

      const session: UserSession = {
        id: res.user.id,
        name: res.user.fullName || cleanInput,
        emailOrCode: res.user.email || cleanInput,
        role: res.user.role,
        schoolCode: authRole === 'SCHOOL_ADMIN' ? schoolCodeInput || res.user.schoolCode || 'SCH-DAP' : res.user.schoolCode,
        token: res.accessToken,
      };

      onLoginSuccess(session);
    } catch (error: any) {
      setErrorMsg(error?.message || 'Unable to sign in. Please verify your credentials.');
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
    SUPER_ADMIN: { email: 'Super Admin Email (patelrajnish47@gmail.com)', pass: 'Secret Password' },
    SCHOOL_ADMIN: { email: 'School Admin Email (admin@dps.edu.in)', pass: 'Password' },
    STUDENT: { email: 'Student ID (e.g. STU-1001)', pass: '4-Digit PIN' },
    PARENT: { email: 'Registered Phone or Email', pass: 'Password' },
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-slate-100/70 to-indigo-50/40 flex items-center justify-center p-3 sm:p-6 lg:p-8">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-72 sm:w-96 h-72 sm:h-96 bg-cyan-200/30 rounded-full blur-3xl" />
      </div>

      {/* ─── REALTIME OTP CONFIRMATION TOAST ─── */}
      {dispatchToast && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 max-w-sm sm:max-w-md w-full bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-2xl border border-indigo-500/40 animate-fade-in-up">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Email Security Gateway</span>
            </div>
            <button onClick={() => setDispatchToast(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-slate-300 mb-2 leading-relaxed">
            Verification code dispatched to <span className="font-bold text-white">{dispatchToast.recipient}</span>.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-cyan-300 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700">
            <Mail size={14} className="shrink-0 text-cyan-400" />
            <span>Please check your email inbox to enter your 6-digit code.</span>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-md my-4 sm:my-8">
        {/* Brand Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-linear-to-br from-indigo-600 to-cyan-500 rounded-2xl shadow-xl shadow-indigo-500/25 mb-3 sm:mb-4 text-white">
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
            <span>Production Multi-Tenant Architecture</span>
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
                  className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    active
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
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium font-mono"
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
                  required
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
                  required
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
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-60 cursor-pointer min-h-11"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying credentials...</span>
                  </span>
                ) : (
                  <>
                    <span>Sign In to {authRole === 'SUPER_ADMIN' ? 'All Tenants Console' : 'School Portal'}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Fill Production Roles */}
          <div className="mt-7 pt-6 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>Select Authorized Role</span>
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

      {/* ─── SECURE PASSWORD RECOVERY MODAL (ZERO OTP EXPOSURE) ─── */}
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
                <span>Security Lockout Active: Please wait {lockoutTimer} seconds before retrying.</span>
              </div>
            )}

            {/* ─── STEP 1: REQUEST VERIFICATION CODE ─── */}
            {forgotStep === 'request' && (
              <form onSubmit={handleSendRecovery} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered account email. A secure 6-digit cryptographic verification code will be dispatched strictly to your email inbox.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={forgotInput}
                      onChange={(e) => setForgotInput(e.target.value)}
                      required
                      placeholder="e.g. patelrajnish47@gmail.com"
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
                    disabled={isLockedOut || isRecoveryLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition cursor-pointer disabled:opacity-50 min-h-11"
                  >
                    {isRecoveryLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Send Verification Code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ─── STEP 2: ENTER VERIFICATION CODE (FROM EMAIL ONLY) ─── */}
            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">Verification Code Sent To:</span>
                    <span className="text-xs font-mono font-bold text-indigo-600">{maskedRecipient || forgotInput}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Code valid for 10 minutes</span>
                    <span className="font-mono font-bold text-slate-700">{otpCountdown}s countdown</span>
                  </div>
                </div>

                {/* Secure Email Instruction (No Code Displayed!) */}
                <div className="bg-indigo-50/90 border border-indigo-200/80 rounded-2xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                    <Mail size={16} className="text-indigo-600 shrink-0" />
                    <span>Check Your Email Inbox</span>
                  </div>
                  <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                    A 6-digit verification code has been dispatched to your email. Please check your inbox or spam folder and enter the 6 digits below.
                  </p>
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
                      onClick={handleSendRecovery}
                      className={`text-xs font-bold inline-flex items-center gap-1 transition ${
                        canResend && !isLockedOut
                          ? 'text-indigo-600 hover:text-indigo-800 cursor-pointer underline'
                          : 'text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <RotateCcw size={12} />
                      <span>{canResend ? 'Resend New Code' : `Resend in ${otpCountdown}s`}</span>
                    </button>
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
                    disabled={isLockedOut || isRecoveryLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition cursor-pointer disabled:opacity-50 min-h-11"
                  >
                    {isRecoveryLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Verify Security Code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ─── STEP 3: SET NEW PASSWORD (AUTHORIZED VIA SERVER RESET TOKEN) ─── */}
            {forgotStep === 'password' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  <span>Verification Successful. Create your new secure password.</span>
                </div>

                {/* New Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter at least 8 characters"
                      required
                      className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1 h-1.5">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength >= lvl
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
                    <p className="text-[11px] text-slate-400">
                      Must contain uppercase, lowercase, numbers & special character.
                    </p>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm New Password
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
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setForgotStep('otp')}
                    className="py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer text-center"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isRecoveryLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition cursor-pointer disabled:opacity-50 min-h-11"
                  >
                    {isRecoveryLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Update Password & Save</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ─── STEP 4: SUCCESS CONFIRMATION ─── */}
            {forgotStep === 'success' && (
              <div className="text-center py-5 space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-100">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-lg font-extrabold text-slate-900">Password Updated Successfully</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                  Your new password has been securely hashed and updated in the backend database. You can now sign in immediately.
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
