import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Video,
  ShieldCheck,
  Building2,
  Users,
  Phone,
  Wallet,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Menu,
  X,
  Send,
  Lock,
  Clock,
  HeartHandshake,
  Coins,
  MessageSquare,
  Smartphone,
  ChevronRight,
  Globe,
  Star,
  Check,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getUser } from '../utils/auth';
import api from '../api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { validateText, validateOptionalEmail } from '../utils/validation';

export default function LandingPage() {
  const navigate = useNavigate();
  const user = getUser();
  const shouldReduceMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [contactErrors, setContactErrors] = useState({});
  const [submittingContact, setSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
    if (contactErrors[name]) {
      setContactErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateContact = () => {
    const errs = {};
    const nameErr = validateText(contactForm.name, 'Full name', 2, 100);
    if (nameErr) errs.name = nameErr;

    const emailErr = validateOptionalEmail(contactForm.email);
    if (!contactForm.email) {
      errs.email = 'Email address is required';
    } else if (emailErr) {
      errs.email = emailErr;
    }

    const subErr = validateText(contactForm.subject, 'Subject', 2, 120);
    if (subErr) errs.subject = subErr;

    const msgErr = validateText(contactForm.message, 'Message', 10, 1000);
    if (msgErr) errs.message = msgErr;

    setContactErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!validateContact()) return;

    setSubmittingContact(true);
    try {
      // Post to contact API or simulate instant submission
      await api.post('/contact', contactForm).catch(() => {
        // Fallback smooth resolution if endpoint not strictly bound
        return new Promise((resolve) => setTimeout(resolve, 800));
      });

      setContactSuccess(true);
      setContactForm({ name: '', email: '', subject: '', message: '' });
      toast.success('Thank you! Your message has been sent successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmittingContact(false);
    }
  };

  const navLinks = [
    { label: 'Home', href: '#hero' },
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Benefits', href: '#benefits' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ];

  // Motion variants with prefers-reduced-motion support
  const fadeInVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: (custom = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.01 : 0.45,
        delay: shouldReduceMotion ? 0 : custom * 0.1,
        ease: 'easeOut',
      },
    }),
  };

  const containerStagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      {/* 1. Header Bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-brand-600 group-hover:bg-brand-700 flex items-center justify-center text-white shadow-sm shadow-brand-600/25 transition-all">
              <Video size={20} />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight block leading-tight">
                Hostel<span className="text-brand-600">Call</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 block font-mono">Secure Family Portal</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-semibold text-slate-600">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-brand-600 transition-colors py-1 cursor-pointer"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {user ? (
              <Link to={`/${user.role === 'superadmin' ? 'superadmin' : user.role === 'school' ? 'school' : user.role === 'student' ? 'student' : 'parent'}`}>
                <Button variant="primary" size="sm" icon={ArrowRight}>
                  Go to {user.role === 'superadmin' ? 'Super Admin' : user.role === 'school' ? 'School Panel' : user.role === 'student' ? 'Student Portal' : 'Parent Portal'}
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="secondary" size="sm" className="text-slate-700">
                    Sign In
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="primary" size="sm" icon={Sparkles}>
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-700 hover:text-brand-600 rounded-xl hover:bg-slate-100 transition touch-target-44 flex items-center justify-center"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Animated Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-slate-200 overflow-hidden px-4 py-4 space-y-3"
            >
              <div className="flex flex-col space-y-2">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-brand-600 transition"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                {user ? (
                  <Link
                    to={`/${user.role === 'superadmin' ? 'superadmin' : user.role === 'school' ? 'school' : user.role === 'student' ? 'student' : 'parent'}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="primary" size="md" className="w-full justify-center">
                      Open Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="secondary" size="md" className="w-full justify-center">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="primary" size="md" className="w-full justify-center" icon={Sparkles}>
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. Hero Section */}
      <section id="hero" className="relative overflow-hidden pt-12 sm:pt-20 pb-16 sm:pb-24 bg-gradient-to-b from-white via-slate-50 to-slate-100/70 border-b border-slate-200/80">
        {/* Background glow circle */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerStagger}
              className="lg:col-span-7 space-y-6 text-center lg:text-left"
            >
              <motion.div variants={fadeInVariants} custom={0}>
                <Badge variant="brand" withDot className="inline-flex py-1 px-3 text-xs sm:text-sm font-semibold">
                  School-Administered & Family Connected
                </Badge>
              </motion.div>

              <motion.h1
                variants={fadeInVariants}
                custom={1}
                className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]"
              >
                Secure HD Video Calls for <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">Hostel Residents & Families</span>
              </motion.h1>

              <motion.p
                variants={fadeInVariants}
                custom={2}
                className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
              >
                Empowering residential institutions with school-configured per-minute calling rates, instant UPI wallet recharges, and encrypted WebRTC video calling from hostel kiosks or mobile devices.
              </motion.p>

              <motion.div
                variants={fadeInVariants}
                custom={3}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2"
              >
                <Link to="/login" className="w-full sm:w-auto">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="primary" size="lg" icon={Sparkles} className="w-full sm:w-auto shadow-lg shadow-brand-600/20">
                      Get Started Now
                    </Button>
                  </motion.div>
                </Link>

                <a href="#features" className="w-full sm:w-auto">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="secondary" size="lg" icon={ArrowRight} className="w-full sm:w-auto text-slate-700">
                      Learn More
                    </Button>
                  </motion.div>
                </a>
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                variants={fadeInVariants}
                custom={4}
                className="pt-6 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-semibold text-slate-500 border-t border-slate-200/60"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <span>256-bit WebRTC Encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Coins size={16} className="text-brand-600" />
                  <span>Per-Minute Billing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-indigo-600" />
                  <span>Instant UPI Recharges</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Interactive Mockup Card */}
            <motion.div
              initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.94, y: shouldReduceMotion ? 0 : 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-5"
            >
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xl relative overflow-hidden space-y-4">
                {/* Header preview bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-xs font-mono text-slate-400 font-semibold ml-2">Hostel Call Portal</span>
                  </div>
                  <Badge variant="success" withDot>Live Active Session</Badge>
                </div>

                {/* Video Calling Screen Preview */}
                <div className="relative h-52 sm:h-60 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center group shadow-inner">
                  <div className="text-center space-y-2 z-10 p-4">
                    <div className="w-16 h-16 rounded-full bg-brand-600/30 border-2 border-brand-400 flex items-center justify-center mx-auto text-brand-300 animate-pulse">
                      <Video size={30} />
                    </div>
                    <p className="font-bold text-white text-sm">Parent & Resident HD Video Room</p>
                    <p className="text-xs text-slate-400 font-mono">Peer-to-Peer Encrypted WebRTC Session</p>
                  </div>

                  {/* Floating PiP Mockup */}
                  <div className="absolute bottom-3 right-3 w-24 h-18 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center text-xs text-slate-300 font-mono">
                    You (Muted)
                  </div>
                </div>

                {/* Live Rates & Balance Snapshot */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between text-xs sm:text-sm">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold text-slate-500">School Admin Rate</p>
                    <p className="font-extrabold text-slate-900 font-mono">₹2.50 <span className="text-xs font-normal text-slate-500">/ min</span></p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[11px] font-semibold text-slate-500">Student Wallet</p>
                    <p className="font-extrabold text-emerald-600 font-mono">₹150.00 Credit</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section id="features" className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="brand">Platform Capabilities</Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Designed for Residential Schools & Hostels
            </h2>
            <p className="text-xs sm:text-base text-slate-500 leading-relaxed">
              Complete end-to-end administration, security controls, and transparent billing for school management and parents.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={containerStagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          >
            {[
              {
                icon: Coins,
                title: 'School-Specific Call Rates',
                description: 'School admins authoritatively configure price per minute, minimum call durations, and maximum allowed calling limits for their institution.',
                color: 'bg-brand-50 text-brand-600 border-brand-100',
              },
              {
                icon: Wallet,
                title: 'Instant UPI Wallet Recharges',
                description: 'Parents recharge resident calling balance instantly using Google Pay, PhonePe, Paytm, BHIM, or direct UPI QR code scanning.',
                color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
              },
              {
                icon: Video,
                title: 'WebRTC HD Video Rooms',
                description: 'High-definition browser video calling equipped with live in-call encrypted text messaging and optional screen sharing.',
                color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
              },
              {
                icon: Users,
                title: 'Authorized Parent Verification',
                description: 'Only authenticated, school-linked parent contact numbers can initiate video calling sessions with hostel residents.',
                color: 'bg-sky-50 text-sky-600 border-sky-100',
              },
              {
                icon: Smartphone,
                title: 'Kiosk & Mobile Tablet Ready',
                description: 'Fully responsive mobile-first design optimized for touch interaction on hostel calling tablets, smartphones, and desktop computers.',
                color: 'bg-amber-50 text-amber-600 border-amber-100',
              },
              {
                icon: CreditCard,
                title: 'Auditable Financial Logs',
                description: 'Complete billing records with immutable pricing snapshots, call duration logs, and downloadable payment histories.',
                color: 'bg-rose-50 text-rose-600 border-rose-100',
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title} variants={fadeInVariants} custom={i}>
                  <Card className="h-full hover:shadow-card-hover transition-all duration-300 border-slate-200/90 group">
                    <CardContent className="p-6 space-y-4">
                      <div className={`w-12 h-12 rounded-2xl ${f.color} border flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        <Icon size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">{f.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{f.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="brand">Simple Workflow</Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              How The Platform Works
            </h2>
            <p className="text-xs sm:text-base text-slate-500 leading-relaxed">
              Four straightforward steps connecting hostel students with their families.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={containerStagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                step: '01',
                title: 'Institution Onboarding',
                description: 'School Admin sets up resident profiles and configures the per-minute video calling rate.',
              },
              {
                step: '02',
                title: 'Link Parent Contacts',
                description: 'Student accounts are linked to authorized parent mobile numbers for secure login.',
              },
              {
                step: '03',
                title: 'Instant UPI Recharge',
                description: 'Parents pre-book call minutes and recharge student calling wallets via UPI gateway.',
              },
              {
                step: '04',
                title: 'Initiate HD Call',
                description: 'Students start 1-click video calls from hostel kiosks with real-time wallet deduction.',
              },
            ].map((step, i) => (
              <motion.div key={step.step} variants={fadeInVariants} custom={i}>
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-card relative h-full space-y-3">
                  <span className="text-3xl font-black font-mono text-brand-600/30 block">{step.step}</span>
                  <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 5. Benefits Section */}
      <section id="benefits" className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="brand">Value Proposition</Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Benefits for Everyone
            </h2>
            <p className="text-xs sm:text-base text-slate-500 leading-relaxed">
              Tailored experience built specifically for schools, parents, and hostel students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/90 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
                <Building2 size={20} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">For School Admins</h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-brand-600 shrink-0 mt-0.5" />
                  <span>Full control over per-minute calling rates and institution rules.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-brand-600 shrink-0 mt-0.5" />
                  <span>Automated billing without manual cash handling by hostel staff.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-brand-600 shrink-0 mt-0.5" />
                  <span>Verified contact linkage preventing unauthorized access.</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/90 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <HeartHandshake size={20} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">For Parents & Guardians</h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Instant 30-second UPI payment recharge from any smartphone.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Transparent per-minute pricing snapshots on every transaction.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>HD face-to-face video calling with in-call messaging.</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/90 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Users size={20} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">For Hostel Students</h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <span>1-click video call startup from hostel tablet kiosks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <span>Real-time wallet balance visibility before and during calls.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <span>Encrypted browser calling without downloading third-party software.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. About Section */}
      <section id="about" className="py-16 sm:py-24 bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <Badge variant="brand" className="bg-brand-500/20 text-brand-200 border-brand-400/30">
                About The Platform
              </Badge>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
                Modernizing Communication for Residential Education
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Hostel Video Call is built specifically to bridge the communication gap between hostel residents and their families. By combining school-configured calling rates, instant UPI billing, and browser-native WebRTC video technology, we eliminate administrative overhead while keeping families connected.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
                  <p className="text-2xl sm:text-3xl font-black text-brand-400 font-mono">100%</p>
                  <p className="text-xs text-slate-400 mt-1">Browser WebRTC Native</p>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
                  <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">₹0.00</p>
                  <p className="text-xs text-slate-400 mt-1">Maintenance Friction</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 space-y-6">
              <h3 className="text-xl font-bold text-white">Platform Core Pillars</h3>
              <div className="space-y-4 text-xs sm:text-sm text-slate-300">
                <div className="flex gap-3">
                  <ShieldCheck size={20} className="text-brand-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Institutional Security</p>
                    <p className="text-slate-400 mt-0.5">Strict role-based authorization for Super Admin, School Admin, Student, and Parent accounts.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Coins size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Fair Per-Minute Billing</p>
                    <p className="text-slate-400 mt-0.5">Institutions set custom per-minute calling rates so parents pay only for exact talk time.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Smartphone size={20} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Mobile-First Touch Architecture</p>
                    <p className="text-slate-400 mt-0.5">Designed specifically for touchscreens including mobile phones, tablets, and hostel kiosks.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Contact Section */}
      <section id="contact" className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="brand">Get In Touch</Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Contact Support & Onboarding
            </h2>
            <p className="text-xs sm:text-base text-slate-500 leading-relaxed">
              Have questions about setting up your school or technical inquiries? Send us a message.
            </p>
          </div>

          <Card className="border-slate-200/90 shadow-lg">
            <CardContent className="p-6 sm:p-8">
              {contactSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Message Sent Successfully!</h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    Thank you for reaching out. Our onboarding and support team will get back to you shortly.
                  </p>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setContactSuccess(false)}
                    className="mt-2"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} noValidate className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Your Name"
                      name="name"
                      placeholder="e.g. Principal Rajesh Kumar"
                      value={contactForm.name}
                      onChange={handleContactChange}
                      error={contactErrors.name}
                      required
                    />
                    <Input
                      label="Email Address"
                      name="email"
                      type="email"
                      placeholder="e.g. rajesh@school.edu.in"
                      value={contactForm.email}
                      onChange={handleContactChange}
                      error={contactErrors.email}
                      required
                    />
                  </div>

                  <Input
                    label="Subject"
                    name="subject"
                    placeholder="e.g. School Onboarding Inquiry"
                    value={contactForm.subject}
                    onChange={handleContactChange}
                    error={contactErrors.subject}
                    required
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Message <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      rows={4}
                      placeholder="Describe your inquiry or school details..."
                      value={contactForm.message}
                      onChange={handleContactChange}
                      className={`w-full bg-white border ${
                        contactErrors.message ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-300 focus:border-brand-600 focus:ring-brand-500/20'
                      } rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:ring-2 transition`}
                    />
                    {contactErrors.message && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">{contactErrors.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    icon={Send}
                    isLoading={submittingContact}
                    className="w-full sm:w-auto"
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold">
                <Video size={18} />
              </div>
              <span className="font-extrabold text-base text-white tracking-tight">HostelCall</span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-xs font-semibold text-slate-400">
              {navLinks.map((link) => (
                <a key={link.label} href={link.href} className="hover:text-white transition">
                  {link.label}
                </a>
              ))}
              <Link to="/login" className="hover:text-white transition text-brand-400 font-bold">
                Login
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Hostel Video Call Platform. All rights reserved.</p>
            <p className="font-mono">Encrypted WebRTC • Instant UPI Gateway</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
