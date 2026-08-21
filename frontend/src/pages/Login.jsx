import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Video, Lock, Mail, Phone, Eye, EyeOff, KeyRound, Building2, User, ShieldCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import api from '../api';
import { setAuth } from '../utils/auth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import OtpInput from '../components/ui/OtpInput';
import Modal from '../components/ui/Modal';
import { validateEmail, validatePhone, validatePassword, validateText, validateOtp } from '../utils/validation';
import { requestSupabaseEmailOtp, verifySupabaseEmailOtp, isSupabaseConfigured } from '../utils/supabase';


export default function Login() {
  const [role, setRole] = useState('superadmin');
  const [form, setForm] = useState({
    email: '',
    password: '',
    schoolCode: '',
    studentId: '',
    mobile: '',
    otp: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [parentChannel, setParentChannel] = useState('email'); // 'email' or 'mobile'
  const [resendCooldown, setResendCooldown] = useState(0);

  // Dynamic Forgot Password Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = request token, 2 = confirm new password
  const [resetIdentifier, setResetIdentifier] = useState(''); // email or school code
  const [resetToken, setResetToken] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const navigate = useNavigate();

  // Cooldown countdown effect for Resend OTP
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (role === 'superadmin') {
      if (!form.email || !form.email.trim()) {
        newErrors.email = 'Email or Super Admin username is required';
      }
      const passErr = validatePassword(form.password, 4);
      if (passErr) newErrors.password = passErr;
    } else if (role === 'school') {
      const codeErr = validateText(form.schoolCode, 'School code', 2, 30);
      if (codeErr) newErrors.schoolCode = codeErr;
      const passErr = validatePassword(form.password, 4);
      if (passErr) newErrors.password = passErr;
    } else if (role === 'student') {
      const codeErr = validateText(form.schoolCode, 'School code', 2, 30);
      if (codeErr) newErrors.schoolCode = codeErr;
      const idErr = validateText(form.studentId, 'Student ID', 2, 30);
      if (idErr) newErrors.studentId = idErr;
      const passErr = validatePassword(form.password, 4);
      if (passErr) newErrors.password = passErr;
    } else if (role === 'parent') {
      if (parentChannel === 'email') {
        const emailErr = validateEmail(form.email, 'Email address');
        if (emailErr) newErrors.email = emailErr;
      } else {
        const phoneErr = validatePhone(form.mobile, 'Mobile number');
        if (phoneErr) newErrors.mobile = phoneErr;
      }
      if (otpSent) {
        const otpErr = validateOtp(form.otp);
        if (otpErr) newErrors.otp = otpErr;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    const target = parentChannel === 'email' ? form.email.trim().toLowerCase() : form.mobile.trim();
    if (!target) {
      toast.error(`Please enter a valid ${parentChannel === 'email' ? 'email address' : 'mobile number'}`);
      return;
    }
    setLoading(true);
    try {
      if (parentChannel === 'email' && isSupabaseConfigured()) {
        const supaRes = await requestSupabaseEmailOtp(target);
        if (supaRes.error) {
          toast.error(supaRes.error.message || 'Failed to resend OTP');
          return;
        }
        toast.success('Verification code resent to your email.');
      } else {
        const res = await api.post('/auth/parent/resend-otp', {
          destination: target,
          email: parentChannel === 'email' ? target : '',
          mobile: parentChannel === 'mobile' ? target : '',
        });
        toast.success(res.data.message || 'Verification code resent!');
      }
      setResendCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      let res;

      if (role === 'superadmin') {
        res = await api.post('/auth/superadmin/login', {
          email: form.email.trim(),
          password: form.password,
        });
        setAuth(res.data.data.token, res.data.data.user);
        toast.success('Welcome Super Admin!');
        navigate('/superadmin', { replace: true });
      } else if (role === 'school') {
        res = await api.post('/auth/school/login', {
          schoolCode: form.schoolCode.trim(),
          password: form.password,
        });
        setAuth(res.data.data.token, res.data.data.user);
        toast.success('Welcome School Admin!');
        navigate('/school', { replace: true });
      } else if (role === 'student') {
        res = await api.post('/auth/student/login', {
          schoolCode: form.schoolCode.trim(),
          studentId: form.studentId.trim(),
          password: form.password,
        });
        setAuth(res.data.data.token, res.data.data.user);
        toast.success('Welcome Student!');
        navigate('/student', { replace: true });
      } else if (role === 'parent') {
        const targetDestination = parentChannel === 'email' ? form.email.trim().toLowerCase() : form.mobile.trim();

        if (!otpSent) {
          if (parentChannel === 'email' && isSupabaseConfigured()) {
            const supaRes = await requestSupabaseEmailOtp(targetDestination);
            if (supaRes.error) {
              toast.error(supaRes.error.message || 'Failed to send OTP email');
              return;
            }
            setOtpSent(true);
            setResendCooldown(60);
            toast.success('Verification code sent to your email.', { duration: 6000 });
          } else {
            const reqRes = await api.post('/auth/parent/request-otp', {
              destination: targetDestination,
              email: parentChannel === 'email' ? targetDestination : '',
              mobile: parentChannel === 'mobile' ? targetDestination : '',
            });
            setOtpSent(true);
            setResendCooldown(60);
            const defaultMsg = parentChannel === 'email' 
              ? 'Verification code sent to your email.' 
              : 'Verification code sent to your mobile phone.';
            toast.success(reqRes.data.message || defaultMsg, { duration: 6000 });
          }
        } else {
          let supabaseUserId = null;
          if (parentChannel === 'email' && isSupabaseConfigured()) {
            const supaVer = await verifySupabaseEmailOtp(targetDestination, form.otp.trim());
            if (supaVer.error) {
              toast.error(supaVer.error.message || 'Invalid or expired verification code.');
              return;
            }
            supabaseUserId = supaVer.data?.user?.id || null;
          }

          res = await api.post('/auth/parent/verify-otp', {
            destination: targetDestination,
            email: parentChannel === 'email' ? targetDestination : '',
            mobile: parentChannel === 'mobile' ? targetDestination : '',
            otp: form.otp.trim(),
            supabaseUserId,
          });

          const userData = {
            ...res.data.data.user,
            ...(supabaseUserId ? { supabaseUserId } : {}),
          };

          setAuth(res.data.data.token, userData);
          toast.success('Welcome Parent!');
          navigate('/parent', { replace: true });
        }
      }
    } catch (err) {
      if (!err.response) {
        toast.error('Cannot connect to server. Please verify network connection.', { duration: 5000 });
      } else {
        toast.error(err.response?.data?.message || 'Authentication failed. Invalid or expired verification code.');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleRequestResetToken = async (e) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) {
      setResetError(role === 'superadmin' ? 'Please enter your email address' : 'Please enter your school code');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      const payload = role === 'superadmin' 
        ? { role: 'superadmin', email: resetIdentifier.trim() }
        : { role: 'school', schoolCode: resetIdentifier.trim() };
      
      const res = await api.post('/auth/password-reset/request', payload);
      toast.success(res.data.message || 'Reset token generated');
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
      }
      setResetStep(2);
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to request password reset');
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmPasswordReset = async (e) => {
    e.preventDefault();
    if (!resetToken.trim() || !newResetPassword.trim()) {
      setResetError('Reset token and new password are required');
      return;
    }
    if (newResetPassword.length < 6) {
      setResetError('New password must be at least 6 characters');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      const res = await api.post('/auth/password-reset/confirm', {
        role: role === 'superadmin' ? 'superadmin' : 'school',
        resetToken: resetToken.trim(),
        newPassword: newResetPassword.trim(),
      });
      toast.success(res.data.message || 'Password reset successfully!');
      setForgotModalOpen(false);
      setResetStep(1);
      setResetIdentifier('');
      setResetToken('');
      setNewResetPassword('');
    } catch (err) {
      setResetError(err.response?.data?.message || 'Password reset failed');
    } finally {
      setResetLoading(false);
    }
  };

  const roles = [
    { id: 'superadmin', label: 'Super Admin', icon: ShieldCheck },
    { id: 'school', label: 'School', icon: Building2 },
    { id: 'student', label: 'Student', icon: User },
    { id: 'parent', label: 'Parent', icon: Phone },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Back Link */}
        <div className="mb-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition"
          >
            <span>← Back to Home</span>
          </Link>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 text-white shadow-sm shadow-brand-600/25 mx-auto">
            <Video size={24} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Hostel Video Call</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
            Secure browser-based video calling & hostel management platform
          </p>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-8 bg-white py-7 px-5 sm:px-8 shadow-card rounded-2xl border border-slate-200/90"
        >
          {/* Segmented Role Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200/60">
            {roles.map((r) => {
              const isSelected = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRole(r.id);
                    setOtpSent(false);
                    setErrors({});
                  }}
                  className={`relative py-2 px-2 text-xs font-semibold rounded-lg transition duration-150 cursor-pointer text-center truncate ${
                    isSelected ? 'text-brand-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeRolePill"
                      className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/80"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{r.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={role + (otpSent ? '_otp' : '')}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {role === 'superadmin' && (
                  <>
                    <Input
                      label="Email Address"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      error={errors.email}
                      required
                      icon={Mail}
                      placeholder="admin@hostelvideocall.com"
                      autoComplete="email"
                      maxLength={255}
                    />
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      error={errors.password}
                      required
                      icon={Lock}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      minLength={4}
                      maxLength={128}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="hover:text-slate-700 p-1 cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                  </>
                )}

                {role === 'school' && (
                  <>
                    <Input
                      label="School Code"
                      type="text"
                      name="schoolCode"
                      value={form.schoolCode}
                      onChange={handleChange}
                      error={errors.schoolCode}
                      required
                      icon={Building2}
                      placeholder="e.g. SCH001"
                      autoComplete="organization"
                      maxLength={30}
                    />
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      error={errors.password}
                      required
                      icon={Lock}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      minLength={4}
                      maxLength={128}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="hover:text-slate-700 p-1 cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                  </>
                )}

                {role === 'student' && (
                  <>
                    <Input
                      label="School Code"
                      type="text"
                      name="schoolCode"
                      value={form.schoolCode}
                      onChange={handleChange}
                      error={errors.schoolCode}
                      required
                      icon={Building2}
                      placeholder="e.g. SCH001"
                      autoComplete="organization"
                      maxLength={30}
                    />
                    <Input
                      label="Student ID"
                      type="text"
                      name="studentId"
                      value={form.studentId}
                      onChange={handleChange}
                      error={errors.studentId}
                      required
                      icon={User}
                      placeholder="e.g. STU001"
                      autoComplete="username"
                      maxLength={30}
                    />
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      error={errors.password}
                      required
                      icon={Lock}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      minLength={4}
                      maxLength={128}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="hover:text-slate-700 p-1 cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                  </>
                )}

                {role === 'parent' && (
                  <div className="space-y-4">
                    {!otpSent ? (
                      <>
                        <div className="text-center mb-1">
                          <p className="text-xs font-medium text-slate-500">Choose Parent Authentication Method:</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 mb-3">
                          <button
                            type="button"
                            onClick={() => {
                              setParentChannel('sms');
                              setErrors({});
                            }}
                            className={`py-2 px-3 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                              parentChannel === 'sms'
                                ? 'bg-white text-brand-700 shadow-sm border border-slate-200/80 font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Phone size={14} />
                            <span>Continue with SMS OTP</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setParentChannel('email');
                              setErrors({});
                            }}
                            className={`py-2 px-3 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                              parentChannel === 'email'
                                ? 'bg-white text-brand-700 shadow-sm border border-slate-200/80 font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Mail size={14} />
                            <span>Continue with Email OTP</span>
                          </button>
                        </div>

                        {parentChannel === 'email' ? (
                          <Input
                            label="Registered Parent Email"
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            error={errors.email}
                            required
                            icon={Mail}
                            placeholder="patelrajnish47@gmail.com"
                            autoComplete="email"
                            helperText="We will send a 6-digit verification code to your registered email via Resend"
                          />
                        ) : (
                          <Input
                            label="Registered Mobile Phone"
                            type="tel"
                            name="mobile"
                            value={form.mobile}
                            onChange={handleChange}
                            error={errors.mobile}
                            required
                            icon={Phone}
                            placeholder="9876543210"
                            autoComplete="tel"
                            maxLength={10}
                            helperText="We will send a 6-digit SMS OTP to your registered 10-digit mobile number"
                          />
                        )}
                      </>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between p-3.5 bg-brand-50/70 border border-brand-200/80 rounded-xl text-xs">
                          <div>
                            <span className="text-slate-500 font-medium">OTP Code sent to: </span>
                            <span className="font-bold text-slate-800 font-mono">
                              {parentChannel === 'email'
                                ? (form.email.replace(/(.{1,2}).*(@.*)/, '$1***$2'))
                                : (form.mobile.replace(/(\d{2})\d+(\d{3})/, '$1*****$2'))}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setOtpSent(false);
                              setForm((prev) => ({ ...prev, otp: '' }));
                            }}
                            className="inline-flex items-center gap-1 text-brand-700 font-bold hover:underline cursor-pointer"
                          >
                            <ArrowLeft size={13} />
                            <span>Change {parentChannel === 'email' ? 'Email' : 'Mobile'}</span>
                          </button>
                        </div>

                        <OtpInput
                          value={form.otp}
                          onChange={(newOtp) => {
                            setForm((prev) => ({ ...prev, otp: newOtp }));
                            if (errors.otp) setErrors((prev) => ({ ...prev, otp: null }));
                          }}
                          disabled={loading}
                          hasError={!!errors.otp}
                        />
                        {errors.otp && (
                          <p className="text-xs font-semibold text-red-600 text-center">{errors.otp}</p>
                        )}


                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-slate-500">Didn't receive the OTP code?</span>
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={resendCooldown > 0 || loading}
                            className={`inline-flex items-center gap-1 font-semibold transition ${
                              resendCooldown > 0 || loading
                                ? 'text-slate-400 cursor-not-allowed'
                                : 'text-brand-600 hover:text-brand-700 hover:underline cursor-pointer'
                            }`}
                          >
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                            <span>
                              {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
                            </span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {(role === 'superadmin' || role === 'school') && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(true);
                    setResetStep(1);
                    setResetError('');
                    setResetIdentifier(role === 'superadmin' ? form.email : form.schoolCode);
                  }}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full mt-2"
            >
              {role === 'parent' && !otpSent ? 'Send Verification OTP' : 'Sign In'}
            </Button>
          </form>

          {/* Quick Demo Credentials Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Demo Credentials: Super Admin (<span className="text-slate-600 font-mono">patelrajnish47@gmail.com</span>) • Parent (<span className="text-slate-600 font-mono">patelrajnish47@gmail.com</span> via Email OTP)
            </p>
          </div>
        </motion.div>
      </div>

      {/* Dynamic Reset Password Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => {
          setForgotModalOpen(false);
          setResetStep(1);
          setResetError('');
          setResetIdentifier('');
          setResetToken('');
          setNewResetPassword('');
        }}
        title={`Reset ${role === 'superadmin' ? 'Super Admin' : 'School'} Password`}
        subtitle="Request reset token or dynamically update password"
      >
        {resetStep === 1 ? (
          <form onSubmit={handleRequestResetToken} className="space-y-4">
            {resetError && (
              <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl font-medium">
                {resetError}
              </div>
            )}

            <Input
              label={role === 'superadmin' ? 'Super Admin Email' : 'School Code'}
              type="text"
              placeholder={role === 'superadmin' ? 'admin@hostelvideocall.com' : 'SCH001'}
              value={resetIdentifier}
              onChange={(e) => setResetIdentifier(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setForgotModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={resetLoading}>
                Request Reset Token
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirmPasswordReset} className="space-y-4">
            {resetError && (
              <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl font-medium">
                {resetError}
              </div>
            )}

            <Input
              label="Reset Token"
              type="text"
              placeholder="Paste reset token"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              required
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Min. 6 characters"
              value={newResetPassword}
              onChange={(e) => setNewResetPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setResetStep(1)}
              >
                Back
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={resetLoading}>
                Set New Password
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
