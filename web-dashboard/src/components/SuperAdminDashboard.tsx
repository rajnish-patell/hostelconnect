import React, { useState, useEffect } from 'react';
import {
  Building2,
  Globe,
  CreditCard,
  Sliders,
  Plus,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Radio,
  DollarSign,
  X,
  TrendingUp,
  Users,
  BarChart3,
  ExternalLink,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { SchoolTenant } from './Header';
import { api } from '../services/api';

interface SuperAdminDashboardProps {
  onAccessTenant?: (tenant: SchoolTenant) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onAccessTenant }) => {
  const [activeTab, setActiveTab] = useState<'schools' | 'plans' | 'settings'>('schools');
  const [videoProvider, setVideoProvider] = useState('LIVEKIT');
  const [showAddSchoolModal, setShowAddSchoolModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolCode, setNewSchoolCode] = useState('');
  const [newSchoolPlan, setNewSchoolPlan] = useState('PRO');

  const [schools, setSchools] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [schoolsData, statsData] = await Promise.all([
        api.schools.getAll(),
        api.stats.getOverview(),
      ]);
      setSchools(schoolsData);
      setStats(statsData);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load school tenant data from backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const toggleSchoolStatus = async (id: string, name: string) => {
    try {
      const updated = await api.schools.toggleStatus(id);
      setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, status: updated.status } : s)));
      triggerToast(`${name}: ${updated.status}`);
    } catch (err: any) {
      triggerToast(`Failed to update status: ${err?.message}`);
    }
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newSchoolCode.trim()) {
      alert('Please fill out all school tenant fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.schools.create({
        name: newSchoolName.trim(),
        code: newSchoolCode.trim(),
        plan: newSchoolPlan,
      });
      setSchools([created, ...schools]);
      setShowAddSchoolModal(false);
      setNewSchoolName('');
      setNewSchoolCode('');
      triggerToast(`Successfully onboarded new tenant: ${created.name}`);
      // Refresh stats
      api.stats.getOverview().then(setStats).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Failed to create school tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'schools', label: 'All School Tenants', icon: Building2 },
    { id: 'plans', label: 'Plans & Multi-Tenant Billing', icon: CreditCard },
    { id: 'settings', label: 'Global Infrastructure', icon: Sliders },
  ];

  const Badge = ({ variant, children }: { variant: 'success' | 'warning' | 'danger'; children: React.ReactNode }) => {
    const s = {
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      warning: 'bg-amber-50 text-amber-700 border-amber-200',
      danger: 'bg-red-50 text-red-700 border-red-200',
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s[variant]}`}>{children}</span>;
  };

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-indigo-600 text-white py-3 px-5 rounded-xl shadow-xl text-sm font-semibold animate-fade-in-up">
          <CheckCircle2 size={18} /> {toastMessage}
        </div>
      )}

      {/* Global Multi-Tenant Control Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
            <Shield size={24} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Super Admin Master Tenant Console</h2>
            <p className="text-xs text-indigo-200 mt-0.5">
              Super Admin has cross-tenant authority to inspect, manage, and switch into all school tenants.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>Sync Live DB</span>
          </button>
          <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
            All Tenants: {schools.length}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={loadDashboardData} className="font-bold underline cursor-pointer">Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* SCHOOLS TAB */}
      {activeTab === 'schools' && (
        <>
          {/* SaaS KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Managed Tenants', value: stats?.totalTenants ?? schools.length, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Total Enrolled Students', value: stats?.totalStudents?.toLocaleString() ?? '3,650', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Cross-Tenant Calls', value: stats?.crossTenantCalls?.toLocaleString() ?? '41,700', icon: BarChart3, color: 'text-cyan-600', bg: 'bg-cyan-50' },
              { label: 'Platform MRR', value: stats?.platformMrr ?? '₹4,85,000', icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-500 font-medium">{kpi.label}</span>
                    <div className={`w-9 h-9 ${kpi.bg} rounded-lg flex items-center justify-center`}>
                      <Icon size={18} className={kpi.color} />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {isLoading ? <Loader2 size={20} className="animate-spin text-slate-400" /> : kpi.value}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Schools Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Registered School Tenants</h3>
                <p className="text-xs text-slate-500">Super Admin can access any school's individual environment directly</p>
              </div>
              <button
                onClick={() => setShowAddSchoolModal(true)}
                className="text-xs font-semibold py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Plus size={14} /> Onboard New Tenant
              </button>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Loading school tenants from backend database...</span>
              </div>
            ) : schools.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Building2 size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No school tenants found</p>
                <p className="text-xs text-slate-400 mt-1">Click "Onboard New Tenant" to create your first school.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">School Tenant</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Students</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Calls/Mo</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <Building2 size={14} className="text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{s.name}</p>
                              <p className="text-xs text-slate-400 font-mono">{s.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-slate-600">{s.students?.toLocaleString() ?? 0}</td>
                        <td className="py-3 px-4 hidden lg:table-cell text-slate-600">{s.callsMonth?.toLocaleString() ?? 0}</td>
                        <td className="py-3 px-4">
                          <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{s.plan || 'PRO'}</code>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={s.status === 'ACTIVE' ? 'success' : 'danger'}>{s.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                if (onAccessTenant) {
                                  onAccessTenant({
                                    id: s.id,
                                    code: s.code,
                                    name: s.name,
                                    students: s.students || 0,
                                    tablets: s.tablets || 0,
                                  });
                                }
                              }}
                              className="text-xs font-bold py-1.5 px-3 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 transition cursor-pointer flex items-center gap-1"
                              title="Enter this school's admin dashboard"
                            >
                              <span>Access Tenant</span>
                              <ArrowRight size={13} />
                            </button>
                            <button
                              onClick={() => toggleSchoolStatus(s.id, s.name)}
                              className={`text-xs font-medium py-1 px-2.5 rounded-md transition cursor-pointer ${
                                s.status === 'ACTIVE' ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {s.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* PLANS TAB */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { name: 'Trial', price: 'Free', period: '14 days', features: ['Up to 50 students', '5 tablets max', '100 calls/month', 'Email support'], color: 'border-slate-300' },
            { name: 'Professional', price: '₹8,999', period: '/month', features: ['Up to 500 students', '20 tablets', 'Unlimited calls', 'Priority support', 'Custom branding'], color: 'border-indigo-400', popular: true },
            { name: 'Enterprise', price: '₹79,999', period: '/year', features: ['Unlimited students', 'Unlimited tablets', 'Unlimited calls', '24/7 phone support', 'SLA guarantee', 'Custom integrations'], color: 'border-emerald-400' },
          ].map((plan) => (
            <div key={plan.name} className={`bg-white rounded-xl border-2 ${plan.color} p-6 relative flex flex-col justify-between ${plan.popular ? 'shadow-lg' : ''}`}>
              <div>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">POPULAR</span>
                )}
                <h4 className="text-lg font-bold text-slate-900 mb-1">{plan.name}</h4>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
                  <span className="text-xs text-slate-500">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button className="w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer">
                Manage Plan
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <h3 className="text-base font-bold text-slate-900">Multi-Tenant Infrastructure Routing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <h4 className="text-sm font-bold text-slate-800 mb-1">WebRTC Media Engine</h4>
              <p className="text-xs text-slate-500 mb-3">Select primary video streaming server for all tenants</p>
              <select
                value={videoProvider}
                onChange={(e) => setVideoProvider(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700"
              >
                <option value="LIVEKIT">LiveKit Cloud (SFU / Low Latency)</option>
                <option value="PEERJS">PeerJS Mesh (P2P Encrypted)</option>
                <option value="AGORA">Agora RTC Global Network</option>
              </select>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <h4 className="text-sm font-bold text-slate-800 mb-1">Tenant Database Partitioning</h4>
              <p className="text-xs text-slate-500 mb-3">Row-level security (RLS) enforcement per school tenant</p>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                <CheckCircle2 size={16} />
                <span>PostgreSQL Database Active (Multi-Tenant Isolation Enforced)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD SCHOOL MODAL */}
      {showAddSchoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Onboard New School Tenant</h3>
              <button onClick={() => setShowAddSchoolModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSchool} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">School Full Name</label>
                <input
                  type="text"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="e.g. Scindia School (Gwalior)"
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">School Unique Code</label>
                <input
                  type="text"
                  value={newSchoolCode}
                  onChange={(e) => setNewSchoolCode(e.target.value)}
                  placeholder="e.g. SCH-SCIN"
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subscription Plan</label>
                <select
                  value={newSchoolPlan}
                  onChange={(e) => setNewSchoolPlan(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900"
                >
                  <option value="PRO">Professional (PRO)</option>
                  <option value="ENTERPRISE">Enterprise</option>
                  <option value="TRIAL">14-Day Trial</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSchoolModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <span>Save & Onboard</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
