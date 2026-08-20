import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Video, Lock, Mail, Phone, Eye, EyeOff, KeyRound, Building2, User, ShieldCheck } from 'lucide-react';
import api from '../api';
import { setAuth } from '../utils/auth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { validateEmail, validatePhone, validatePassword, validateText, validateOtp } from '../utils/validation';

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
  const navigate = useNavigate();

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
      const phoneErr = validatePhone(form.mobile, 'Mobile number');
      if (phoneErr) newErrors.mobile = phoneErr;
      if (otpSent) {
        const otpErr = validateOtp(form.otp);
        if (otpErr) newErrors.otp = otpErr;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        const cleanMobile = form.mobile.replace(/\D/g, '').slice(-10);

        if (!otpSent) {
          await api.post('/auth/parent/request-otp', { mobile: cleanMobile });
          setOtpSent(true);
          toast.success('OTP sent successfully! (Demo OTP: 123456)');
        } else {
          res = await api.post('/auth/parent/verify-otp', {
            mobile: cleanMobile,
            otp: form.otp.trim(),
          });
          setAuth(res.data.data.token, res.data.data.user);
          toast.success('Welcome Parent!');
          navigate('/parent', { replace: true });
        }
      }
    } catch (err) {
      if (!err.response) {
        toast.error('Cannot connect to backend server. Please verify network.', { duration: 5000 });
      } else {
        toast.error(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
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
                  <>
                    <Input
                      label="Registered Mobile Number"
                      type="tel"
                      inputMode="numeric"
                      name="mobile"
                      value={form.mobile}
                      onChange={handleChange}
                      error={errors.mobile}
                      required
                      icon={Phone}
                      placeholder="e.g. 9876501234"
                      autoComplete="tel"
                      maxLength={10}
                    />
                    {otpSent && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.2 }}
                      >
                        <Input
                          label="6-Digit Verification OTP"
                          type="text"
                          inputMode="numeric"
                          name="otp"
                          value={form.otp}
                          onChange={handleChange}
                          error={errors.otp}
                          required
                          maxLength={6}
                          icon={KeyRound}
                          placeholder="123456"
                          className="font-mono text-center tracking-widest text-base font-bold"
                          helperText="Use demo OTP: 123456"
                        />
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

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
              Demo Credentials: Super Admin (<span className="text-slate-600 font-mono">admin@hostelvideocall.com</span>) • Parent (<span className="text-slate-600 font-mono">9876501234</span> / <span className="text-slate-600 font-mono">123456</span>)
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
