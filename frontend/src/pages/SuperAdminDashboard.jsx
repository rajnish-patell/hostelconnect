import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Building2, Users, LogOut, Plus, Power, UserPlus, Menu, Video, ShieldCheck, Edit2, Trash2, CreditCard, Phone, RefreshCw } from 'lucide-react';
import api from '../api';
import { getUser, logout } from '../utils/auth';
import MobileNavDrawer from '../components/MobileNavDrawer';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import {
  validateText,
  validatePassword,
  validateOptionalEmail,
  validateOptionalPhone,
  validatePhone,
  validateNumber,
} from '../utils/validation';

function Sidebar() {
  const location = useLocation();
  const user = getUser();

  const links = [
    { to: '/superadmin', label: 'Overview', icon: Building2 },
    { to: '/superadmin/schools', label: 'Schools', icon: Building2 },
    { to: '/superadmin/students', label: 'Students & Parents', icon: Users },
    { to: '/superadmin/transactions', label: 'Financials & Calls', icon: CreditCard },
  ];

  return (
    <div className="hidden lg:flex w-64 bg-slate-900 text-white min-h-screen flex-col shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white shadow-sm">
          <Video size={18} />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight text-white">Hostel Call</h1>
          <p className="text-[11px] text-slate-400 font-medium">Super Admin</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3.5 space-y-1">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
              }`}
            >
              <Icon size={16} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3.5 border-t border-slate-800/80">
        <div className="px-3 py-2 bg-slate-800/40 rounded-xl border border-slate-800 mb-2">
          <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Administrator'}</p>
          <p className="text-[11px] text-slate-400 truncate">{user?.email || 'admin@hostelvideocall.com'}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          icon={LogOut}
          className="w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}

function DashboardHome() {
  const [stats, setStats] = useState({ schools: 0, students: 0, revenue: 0, minutes: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/schools').catch(() => ({ data: { data: [] } })),
      api.get('/recharge/transactions').catch(() => ({ data: { data: [] } })),
      api.get('/calls/history').catch(() => ({ data: { data: [] } })),
    ]).then(([schoolsRes, txRes, callsRes]) => {
      const schools = schoolsRes.data.data || [];
      const txs = txRes.data.data || [];
      const calls = callsRes.data.data || [];

      const totalRevenue = txs
        .filter((t) => t.status === 'success')
        .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

      const totalSeconds = calls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);

      setStats({
        schools: schools.length,
        students: schools.reduce((acc, s) => acc + (s._count?.students || 0), 0),
        revenue: totalRevenue,
        minutes: Math.floor(totalSeconds / 60),
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Platform Overview</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">High-level statistics, revenue visibility, and school management</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/superadmin/schools">
            <Button variant="secondary" size="sm" icon={Plus}>Add School</Button>
          </Link>
          <Link to="/superadmin/students">
            <Button variant="primary" size="sm" icon={Plus}>Add Student</Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Registered Schools"
          value={stats.schools}
          subtitle="Active educational institutes"
          icon={Building2}
          iconBg="bg-brand-50 text-brand-600 border border-brand-100"
        />
        <StatCard
          title="Total Students"
          value={stats.students}
          subtitle="Enrolled hostel students"
          icon={Users}
          iconBg="bg-indigo-50 text-indigo-600 border border-indigo-100"
        />
        <StatCard
          title="Calling Revenue"
          value={`₹${stats.revenue.toFixed(2)}`}
          subtitle="Gross UPI & cash recharge"
          icon={CreditCard}
          iconBg="bg-emerald-50 text-emerald-600 border border-emerald-100"
        />
        <StatCard
          title="Total Call Minutes"
          value={`${stats.minutes} mins`}
          subtitle="Completed HD video sessions"
          icon={Phone}
          iconBg="bg-amber-50 text-amber-600 border border-amber-100"
        />
      </div>
    </div>
  );
}

function SchoolsPage() {
  const [schools, setSchools] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  const [form, setForm] = useState({
    schoolCode: '',
    name: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    password: '',
    perMinuteCharge: 2.5,
    callDurationMins: 10,
  });

  const [editForm, setEditForm] = useState({
    name: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    password: '',
    perMinuteCharge: 2.5,
    callDurationMins: 10,
  });

  const loadSchools = () => {
    api.get('/schools').then((res) => setSchools(res.data.data || [])).catch(() => toast.error('Failed to load schools'));
  };

  useEffect(() => { loadSchools(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    if (editErrors[name]) {
      setEditErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    const codeErr = validateText(form.schoolCode, 'School code', 2, 20);
    if (codeErr) errs.schoolCode = codeErr;

    const nameErr = validateText(form.name, 'School name', 2, 100);
    if (nameErr) errs.name = nameErr;

    const passErr = validatePassword(form.password, 6);
    if (passErr) errs.password = passErr;

    const phoneErr = validateOptionalPhone(form.contactPhone, 'Contact phone');
    if (phoneErr) errs.contactPhone = phoneErr;

    const emailErr = validateOptionalEmail(form.contactEmail);
    if (emailErr) errs.contactEmail = emailErr;

    const rateErr = validateNumber(form.perMinuteCharge, 0, 100, 'Per minute charge', true);
    if (rateErr) errs.perMinuteCharge = rateErr;

    const durationErr = validateNumber(form.callDurationMins, 1, 120, 'Call duration', false);
    if (durationErr) errs.callDurationMins = durationErr;

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateEdit = () => {
    const errs = {};
    const nameErr = validateText(editForm.name, 'School name', 2, 100);
    if (nameErr) errs.name = nameErr;

    if (editForm.password && editForm.password.trim()) {
      const passErr = validatePassword(editForm.password, 6);
      if (passErr) errs.password = passErr;
    }

    const phoneErr = validateOptionalPhone(editForm.contactPhone, 'Contact phone');
    if (phoneErr) errs.contactPhone = phoneErr;

    const emailErr = validateOptionalEmail(editForm.contactEmail);
    if (emailErr) errs.contactEmail = emailErr;

    const rateErr = validateNumber(editForm.perMinuteCharge, 0, 100, 'Per minute charge', true);
    if (rateErr) errs.perMinuteCharge = rateErr;

    const durationErr = validateNumber(editForm.callDurationMins, 1, 120, 'Call duration', false);
    if (durationErr) errs.callDurationMins = durationErr;

    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await api.post('/schools', {
        schoolCode: form.schoolCode.trim(),
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        contactPhone: form.contactPhone.replace(/\D/g, '').slice(-10),
        contactEmail: form.contactEmail.trim(),
        password: form.password,
        perMinuteCharge: parseFloat(form.perMinuteCharge),
        callDurationMins: parseInt(form.callDurationMins, 10),
      });
      toast.success('School created successfully!');
      setIsModalOpen(false);
      setForm({
        schoolCode: '',
        name: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        password: '',
        perMinuteCharge: 2.5,
        callDurationMins: 10,
      });
      setErrors({});
      loadSchools();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create school');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (school) => {
    setEditingSchool(school);
    setEditForm({
      name: school.name || '',
      contactPerson: school.contactPerson || '',
      contactPhone: school.contactPhone || '',
      contactEmail: school.contactEmail || '',
      password: '',
      perMinuteCharge: school.perMinuteCharge || 2.5,
      callDurationMins: school.callDurationMins || 10,
    });
    setEditErrors({});
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateEdit() || !editingSchool) return;

    setLoading(true);
    try {
      await api.put(`/schools/${editingSchool.id}`, {
        name: editForm.name.trim(),
        contactPerson: editForm.contactPerson.trim(),
        contactPhone: editForm.contactPhone.replace(/\D/g, '').slice(-10),
        contactEmail: editForm.contactEmail.trim(),
        password: editForm.password ? editForm.password.trim() : undefined,
        perMinuteCharge: parseFloat(editForm.perMinuteCharge),
        callDurationMins: parseInt(editForm.callDurationMins, 10),
      });
      toast.success('School updated successfully!');
      setEditingSchool(null);
      loadSchools();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update school');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id) => {
    try {
      await api.patch(`/schools/${id}/status`);
      toast.success('School status updated');
      loadSchools();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Schools & Hostels</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage registered residential schools and billing charges</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            setIsModalOpen(true);
            setErrors({});
          }}
        >
          Add School
        </Button>
      </div>

      {/* Add School Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New School"
        subtitle="Register a new residential campus or school portal"
      >
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="School Code"
              name="schoolCode"
              placeholder="e.g. SCH002"
              value={form.schoolCode}
              onChange={handleChange}
              error={errors.schoolCode}
              required
              maxLength={20}
            />
            <Input
              label="School Name"
              name="name"
              placeholder="e.g. Doon Valley Public School"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
              required
              maxLength={100}
            />
            <Input
              label="Contact Person"
              name="contactPerson"
              placeholder="e.g. Principal Sharma"
              value={form.contactPerson}
              onChange={handleChange}
              error={errors.contactPerson}
              maxLength={100}
            />
            <Input
              label="Contact Phone"
              name="contactPhone"
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 9876543210"
              value={form.contactPhone}
              onChange={handleChange}
              error={errors.contactPhone}
              maxLength={10}
            />
            <Input
              label="Contact Email"
              name="contactEmail"
              type="email"
              placeholder="admin@school.com"
              value={form.contactEmail}
              onChange={handleChange}
              error={errors.contactEmail}
              maxLength={255}
            />
            <Input
              label="Portal Password"
              name="password"
              type="password"
              placeholder="Password (min. 6 characters)"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              required
              minLength={6}
              maxLength={128}
            />
            <Input
              label="Per Minute Rate (₹)"
              name="perMinuteCharge"
              type="number"
              min="0"
              max="100"
              step="0.5"
              placeholder="2.50"
              value={form.perMinuteCharge}
              onChange={handleChange}
              error={errors.perMinuteCharge}
              required
            />
            <Input
              label="Default Call Duration (Mins)"
              name="callDurationMins"
              type="number"
              min="1"
              max="120"
              step="1"
              placeholder="10"
              value={form.callDurationMins}
              onChange={handleChange}
              error={errors.callDurationMins}
              required
            />
          </div>

          <div className="flex gap-2.5 pt-4 border-t border-slate-100">
            <Button type="submit" variant="primary" size="md" isLoading={loading} className="flex-1">
              Create School
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit School Modal */}
      <Modal
        isOpen={!!editingSchool}
        onClose={() => setEditingSchool(null)}
        title="Edit School / Hostel"
        subtitle={editingSchool ? `Update details for ${editingSchool.name} (${editingSchool.schoolCode})` : ''}
      >
        <form onSubmit={handleUpdate} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="School Name"
              name="name"
              placeholder="School Name"
              value={editForm.name}
              onChange={handleEditChange}
              error={editErrors.name}
              required
              maxLength={100}
            />
            <Input
              label="Contact Person"
              name="contactPerson"
              placeholder="Contact Person Name"
              value={editForm.contactPerson}
              onChange={handleEditChange}
              error={editErrors.contactPerson}
              maxLength={100}
            />
            <Input
              label="Contact Phone"
              name="contactPhone"
              type="tel"
              inputMode="numeric"
              placeholder="10-digit phone"
              value={editForm.contactPhone}
              onChange={handleEditChange}
              error={editErrors.contactPhone}
              maxLength={10}
            />
            <Input
              label="Contact Email"
              name="contactEmail"
              type="email"
              placeholder="admin@school.com"
              value={editForm.contactEmail}
              onChange={handleEditChange}
              error={editErrors.contactEmail}
              maxLength={255}
            />
            <Input
              label="Per Minute Rate (₹)"
              name="perMinuteCharge"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={editForm.perMinuteCharge}
              onChange={handleEditChange}
              error={editErrors.perMinuteCharge}
              required
            />
            <Input
              label="Default Call Duration (Mins)"
              name="callDurationMins"
              type="number"
              min="1"
              max="120"
              step="1"
              value={editForm.callDurationMins}
              onChange={handleEditChange}
              error={editErrors.callDurationMins}
              required
            />
            <div className="sm:col-span-2">
              <Input
                label="Reset Password"
                name="password"
                type="password"
                placeholder="Leave blank to keep current password"
                value={editForm.password}
                onChange={handleEditChange}
                error={editErrors.password}
                minLength={6}
                maxLength={128}
                helperText="Only fill this if you want to change the school login password"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-4 border-t border-slate-100">
            <Button type="submit" variant="primary" size="md" isLoading={loading} className="flex-1">
              Save Changes
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => setEditingSchool(null)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schools Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80 text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">School Name</th>
                <th className="px-4 py-3">Students</th>
                <th className="px-4 py-3">Rate / Min</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {schools.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <EmptyState
                      icon={Building2}
                      title="No schools registered"
                      description="Click 'Add School' to onboard your first institution."
                      actionLabel="Add School"
                      onAction={() => setIsModalOpen(true)}
                    />
                  </td>
                </tr>
              ) : (
                schools.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-brand-700 font-mono">{s.schoolCode}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{s.name}</td>
                    <td className="px-4 py-3.5 text-slate-700">{s._count?.students || 0}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">₹{s.perMinuteCharge}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={s.isActive ? 'success' : 'danger'} withDot>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Edit2}
                          onClick={() => openEditModal(s)}
                          className="text-slate-700 hover:text-brand-700"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Power}
                          onClick={() => toggleStatus(s.id)}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          Toggle
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [parentModalStudent, setParentModalStudent] = useState(null);
  const [editingParent, setEditingParent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [parentErrors, setParentErrors] = useState({});
  const [editParentErrors, setEditParentErrors] = useState({});

  const [form, setForm] = useState({
    schoolId: '',
    studentId: '',
    name: '',
    classSection: '',
    roomNo: '',
    password: '',
    parentMobile: '',
    parentName: '',
    parentRelation: 'Father',
  });

  const [editForm, setEditForm] = useState({
    schoolId: '',
    studentId: '',
    name: '',
    classSection: '',
    roomNo: '',
    password: '',
  });

  const [parentForm, setParentForm] = useState({
    name: '',
    mobile: '',
    relation: 'Mother',
  });

  const [editParentForm, setEditParentForm] = useState({
    name: '',
    mobile: '',
    relation: 'Mother',
  });

  const loadData = () => {
    api.get('/students').then((res) => setStudents(res.data.data || [])).catch(() => {});
    api.get('/schools').then((res) => {
      const schs = res.data.data || [];
      setSchools(schs);
      if (schs.length > 0 && !form.schoolId) {
        setForm((prev) => ({ ...prev, schoolId: schs[0].id }));
      }
    }).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    if (editErrors[name]) {
      setEditErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateStudent = () => {
    const errs = {};
    if (!form.schoolId) errs.schoolId = 'Please select a school';
    const idErr = validateText(form.studentId, 'Student ID', 2, 20);
    if (idErr) errs.studentId = idErr;
    const nameErr = validateText(form.name, 'Student name', 2, 100);
    if (nameErr) errs.name = nameErr;
    const passErr = validatePassword(form.password, 4);
    if (passErr) errs.password = passErr;
    if (form.parentMobile) {
      const phoneErr = validatePhone(form.parentMobile, 'Parent mobile');
      if (phoneErr) errs.parentMobile = phoneErr;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateEditStudent = () => {
    const errs = {};
    const idErr = validateText(editForm.studentId, 'Student ID', 2, 20);
    if (idErr) errs.studentId = idErr;
    const nameErr = validateText(editForm.name, 'Student name', 2, 100);
    if (nameErr) errs.name = nameErr;
    if (editForm.password && editForm.password.trim()) {
      const passErr = validatePassword(editForm.password, 4);
      if (passErr) errs.password = passErr;
    }
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateStudent()) return;

    setLoading(true);
    try {
      await api.post('/students', {
        schoolId: parseInt(form.schoolId, 10),
        studentId: form.studentId.trim(),
        name: form.name.trim(),
        classSection: form.classSection.trim(),
        roomNo: form.roomNo.trim(),
        password: form.password,
        parentMobile: form.parentMobile ? form.parentMobile.replace(/\D/g, '').slice(-10) : '',
        parentName: form.parentName.trim(),
        parentRelation: form.parentRelation,
      });
      toast.success('Student added successfully!');
      setIsModalOpen(false);
      setForm({
        schoolId: schools[0]?.id || '',
        studentId: '',
        name: '',
        classSection: '',
        roomNo: '',
        password: '',
        parentMobile: '',
        parentName: '',
        parentRelation: 'Father',
      });
      setErrors({});
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create student');
    } finally {
      setLoading(false);
    }
  };

  const openEditStudentModal = (student) => {
    setEditingStudent(student);
    setEditForm({
      schoolId: student.schoolId || '',
      studentId: student.studentId || '',
      name: student.name || '',
      classSection: student.classSection || '',
      roomNo: student.roomNo || '',
      password: '',
    });
    setEditErrors({});
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!validateEditStudent() || !editingStudent) return;

    setLoading(true);
    try {
      await api.put(`/students/${editingStudent.id}`, {
        schoolId: editForm.schoolId ? parseInt(editForm.schoolId, 10) : undefined,
        studentId: editForm.studentId.trim(),
        name: editForm.name.trim(),
        classSection: editForm.classSection.trim(),
        roomNo: editForm.roomNo.trim(),
        password: editForm.password ? editForm.password.trim() : undefined,
      });
      toast.success('Student updated successfully!');
      setEditingStudent(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student');
    } finally {
      setLoading(false);
    }
  };

  const validateParent = () => {
    const errs = {};
    const nameErr = validateText(parentForm.name, 'Parent name', 2, 100);
    if (nameErr) errs.name = nameErr;
    const phoneErr = validatePhone(parentForm.mobile, 'Parent mobile');
    if (phoneErr) errs.mobile = phoneErr;
    setParentErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddParent = async (e) => {
    e.preventDefault();
    if (!validateParent() || !parentModalStudent) return;

    try {
      await api.post(`/students/${parentModalStudent.id}/parents`, {
        name: parentForm.name.trim(),
        mobile: parentForm.mobile.replace(/\D/g, '').slice(-10),
        relation: parentForm.relation,
      });
      toast.success(`Parent added to ${parentModalStudent.name}!`);
      setParentModalStudent(null);
      setParentForm({ name: '', mobile: '', relation: 'Mother' });
      setParentErrors({});
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add parent');
    }
  };

  const openEditParentModal = (parent, studentId) => {
    setEditingParent({ parent, studentId });
    setEditParentForm({
      name: parent.name || '',
      mobile: parent.mobile || '',
      relation: parent.relation || 'Mother',
    });
    setEditParentErrors({});
  };

  const validateEditParent = () => {
    const errs = {};
    const nameErr = validateText(editParentForm.name, 'Parent name', 2, 100);
    if (nameErr) errs.name = nameErr;
    const phoneErr = validatePhone(editParentForm.mobile, 'Parent mobile');
    if (phoneErr) errs.mobile = phoneErr;
    setEditParentErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpdateParent = async (e) => {
    e.preventDefault();
    if (!validateEditParent() || !editingParent) return;

    try {
      await api.put(`/students/parents/${editingParent.parent.id}`, {
        name: editParentForm.name.trim(),
        mobile: editParentForm.mobile.replace(/\D/g, '').slice(-10),
        relation: editParentForm.relation,
      });
      toast.success('Parent contact updated!');
      setEditingParent(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update parent');
    }
  };

  const handleUnlinkParent = async () => {
    if (!editingParent) return;
    if (!window.confirm(`Are you sure you want to unlink ${editingParent.parent.name || editingParent.parent.mobile} from this student?`)) return;

    try {
      await api.delete(`/students/${editingParent.studentId}/parents/${editingParent.parent.id}`);
      toast.success('Parent unlinked successfully');
      setEditingParent(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlink parent');
    }
  };

  const toggleStatus = async (id) => {
    try {
      await api.patch(`/students/${id}/status`);
      toast.success('Student status updated');
      loadData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Students & Parent Contacts</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage student profiles, wallet balances, and linked parents</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            setIsModalOpen(true);
            setErrors({});
          }}
        >
          Add Student
        </Button>
      </div>

      {/* Add Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Student to School"
        subtitle="Register student credentials and link primary parent contact"
      >
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assigned School <span className="text-rose-500">*</span>
              </label>
              <select
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20"
                value={form.schoolId}
                onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
                required
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.schoolCode})
                  </option>
                ))}
              </select>
              {errors.schoolId && <p className="text-xs text-rose-500 mt-1">{errors.schoolId}</p>}
            </div>
            <Input
              label="Student ID"
              name="studentId"
              placeholder="e.g. STU002"
              value={form.studentId}
              onChange={handleChange}
              error={errors.studentId}
              required
              maxLength={20}
            />
            <Input
              label="Full Name"
              name="name"
              placeholder="e.g. Rahul Sharma"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
              required
              maxLength={100}
            />
            <Input
              label="Class / Section"
              name="classSection"
              placeholder="e.g. 10th - A"
              value={form.classSection}
              onChange={handleChange}
              maxLength={50}
            />
            <Input
              label="Hostel Room No"
              name="roomNo"
              placeholder="e.g. Room 104"
              value={form.roomNo}
              onChange={handleChange}
              maxLength={50}
            />
            <Input
              label="Student Login Password"
              name="password"
              type="password"
              placeholder="Password (min. 4 characters)"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              required
              minLength={4}
              maxLength={128}
            />
          </div>

          <h4 className="text-xs font-bold text-slate-700 pt-2 border-t border-slate-100">
            Primary Parent Contact
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Parent Name"
              name="parentName"
              placeholder="Parent Name"
              value={form.parentName}
              onChange={handleChange}
              maxLength={100}
            />
            <Input
              label="Parent Mobile"
              name="parentMobile"
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile"
              value={form.parentMobile}
              onChange={handleChange}
              error={errors.parentMobile}
              maxLength={10}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Relation
              </label>
              <select
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20"
                value={form.parentRelation}
                onChange={(e) => setForm({ ...form, parentRelation: e.target.value })}
              >
                <option>Father</option>
                <option>Mother</option>
                <option>Guardian</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2.5 pt-4 border-t border-slate-100">
            <Button type="submit" variant="primary" size="md" isLoading={loading} className="flex-1">
              Create Student
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        title="Edit Student Details"
        subtitle={editingStudent ? `Update profile for ${editingStudent.name} (${editingStudent.studentId})` : ''}
      >
        <form onSubmit={handleUpdateStudent} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assigned School
              </label>
              <select
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20"
                value={editForm.schoolId}
                onChange={(e) => setEditForm({ ...editForm, schoolId: e.target.value })}
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.schoolCode})
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Student ID"
              name="studentId"
              value={editForm.studentId}
              onChange={handleEditChange}
              error={editErrors.studentId}
              required
              maxLength={20}
            />
            <Input
              label="Full Name"
              name="name"
              value={editForm.name}
              onChange={handleEditChange}
              error={editErrors.name}
              required
              maxLength={100}
            />
            <Input
              label="Class / Section"
              name="classSection"
              value={editForm.classSection}
              onChange={handleEditChange}
              maxLength={50}
            />
            <Input
              label="Hostel Room No"
              name="roomNo"
              value={editForm.roomNo}
              onChange={handleEditChange}
              maxLength={50}
            />
            <Input
              label="Reset Password"
              name="password"
              type="password"
              placeholder="Leave blank to keep current password"
              value={editForm.password}
              onChange={handleEditChange}
              error={editErrors.password}
              minLength={4}
              maxLength={128}
            />
          </div>

          <div className="flex gap-2.5 pt-4 border-t border-slate-100">
            <Button type="submit" variant="primary" size="md" isLoading={loading} className="flex-1">
              Save Changes
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => setEditingStudent(null)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Parent Modal */}
      <Modal
        isOpen={!!parentModalStudent}
        onClose={() => setParentModalStudent(null)}
        title="Add Parent Contact"
        subtitle={parentModalStudent ? `For student: ${parentModalStudent.name} (${parentModalStudent.studentId})` : ''}
      >
        <form onSubmit={handleAddParent} noValidate className="space-y-4">
          <Input
            label="Parent Full Name"
            placeholder="e.g. Mrs. Sunita Sharma"
            value={parentForm.name}
            onChange={(e) => setParentForm({ ...parentForm, name: e.target.value })}
            error={parentErrors.name}
            required
            maxLength={100}
          />
          <Input
            label="Mobile Number (Login OTP)"
            type="tel"
            inputMode="numeric"
            placeholder="10-digit mobile number"
            value={parentForm.mobile}
            onChange={(e) => setParentForm({ ...parentForm, mobile: e.target.value })}
            error={parentErrors.mobile}
            required
            maxLength={10}
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Relation
            </label>
            <select
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20"
              value={parentForm.relation}
              onChange={(e) => setParentForm({ ...parentForm, relation: e.target.value })}
            >
              <option>Mother</option>
              <option>Father</option>
              <option>Guardian</option>
              <option>Brother</option>
              <option>Sister</option>
            </select>
          </div>

          <div className="flex gap-2.5 pt-4 border-t border-slate-100">
            <Button type="submit" variant="primary" size="md" className="flex-1">
              Link Parent
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => setParentModalStudent(null)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Parent Modal */}
      <Modal
        isOpen={!!editingParent}
        onClose={() => setEditingParent(null)}
        title="Edit Linked Parent Contact"
        subtitle={editingParent ? `Update contact details or unlink from student` : ''}
      >
        <form onSubmit={handleUpdateParent} noValidate className="space-y-4">
          <Input
            label="Parent Full Name"
            placeholder="Full name"
            value={editParentForm.name}
            onChange={(e) => setEditParentForm({ ...editParentForm, name: e.target.value })}
            error={editParentErrors.name}
            required
            maxLength={100}
          />
          <Input
            label="Mobile Number (Login OTP)"
            type="tel"
            inputMode="numeric"
            placeholder="10-digit mobile"
            value={editParentForm.mobile}
            onChange={(e) => setEditParentForm({ ...editParentForm, mobile: e.target.value })}
            error={editParentErrors.mobile}
            required
            maxLength={10}
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Relation
            </label>
            <select
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20"
              value={editParentForm.relation}
              onChange={(e) => setEditParentForm({ ...editParentForm, relation: e.target.value })}
            >
              <option>Mother</option>
              <option>Father</option>
              <option>Guardian</option>
              <option>Brother</option>
              <option>Sister</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-slate-100">
            <Button type="submit" variant="primary" size="md" className="flex-1">
              Save Changes
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="md"
              icon={Trash2}
              onClick={handleUnlinkParent}
            >
              Unlink
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => setEditingParent(null)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Students Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80 text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Room / Class</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Linked Parents</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <EmptyState
                      icon={Users}
                      title="No students found"
                      description="Add students to enable video calling sessions."
                      actionLabel="Add Student"
                      onAction={() => setIsModalOpen(true)}
                    />
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-brand-700 font-mono">{s.studentId}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{s.name}</td>
                    <td className="px-4 py-3.5 text-slate-600">{s.school?.name || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600">{s.roomNo || s.classSection || '—'}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 font-mono">
                      ₹{parseFloat(s.walletBalance || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {s.parents && s.parents.length > 0 ? (
                          s.parents.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => openEditParentModal(p.parent, s.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition"
                              title="Click to edit parent contact"
                            >
                              <span>{p.parent?.name || p.parent?.mobile} ({p.parent?.relation})</span>
                              <Edit2 size={10} className="text-slate-400" />
                            </button>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                        <button
                          onClick={() => {
                            setParentModalStudent(s);
                            setParentErrors({});
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700 font-semibold px-2 py-0.5 rounded-md bg-brand-50 hover:bg-brand-100/70 border border-brand-200 transition cursor-pointer"
                          title="Add linked parent"
                        >
                          <UserPlus size={12} /> + Parent
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={s.isActive ? 'success' : 'danger'} withDot>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Edit2}
                          onClick={() => openEditStudentModal(s)}
                          className="text-slate-700 hover:text-brand-700"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Power}
                          onClick={() => toggleStatus(s.id)}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          Toggle
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FinancialsPage() {
  const [transactions, setTransactions] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadFinancials = () => {
    setLoading(true);
    Promise.all([
      api.get('/recharge/transactions').catch(() => ({ data: { data: [] } })),
      api.get('/calls/history').catch(() => ({ data: { data: [] } })),
    ])
      .then(([txRes, callsRes]) => {
        setTransactions(txRes.data.data || []);
        setCalls(callsRes.data.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFinancials();
  }, []);

  const totalRevenue = transactions
    .filter((t) => t.status === 'success')
    .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

  const totalMinutes = Math.floor(
    calls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0) / 60
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Financials & Call Billing</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Auditable transaction logs, school-specific pricing snapshots, and platform revenue
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={RefreshCw}
          isLoading={loading}
          onClick={loadFinancials}
          className="text-slate-600 hover:text-slate-900"
        >
          Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          title="Total Gross Revenue"
          value={`₹${totalRevenue.toFixed(2)}`}
          subtitle="Processed through UPI & Cash"
          icon={CreditCard}
          iconBg="bg-emerald-50 text-emerald-600 border border-emerald-100"
        />
        <StatCard
          title="Total Call Duration"
          value={`${totalMinutes} mins`}
          subtitle="Total platform talk time"
          icon={Phone}
          iconBg="bg-brand-50 text-brand-600 border border-brand-100"
        />
        <StatCard
          title="Total Orders"
          value={transactions.length}
          subtitle="Recharge & calling orders"
          icon={Building2}
          iconBg="bg-indigo-50 text-indigo-600 border border-indigo-100"
        />
      </div>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80 text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Student & School</th>
                <th className="px-4 py-3">Pricing Snapshot</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Transaction ID / Mode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState
                      icon={CreditCard}
                      title="No payment transactions recorded"
                      description="UPI and manual recharge orders will appear here."
                    />
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900">{tx.student?.name || 'Student'}</p>
                      <p className="text-xs text-slate-500">{tx.student?.school?.name || 'School'}</p>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700">
                      ₹{parseFloat(tx.pricePerMinute || 2.5).toFixed(2)}/min
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700">
                      {tx.durationMinutes ? `${tx.durationMinutes} mins` : '—'}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 font-mono">
                      ₹{parseFloat(tx.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-mono text-xs text-slate-600">{tx.transactionId || tx.paymentMode || 'UPI'}</p>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">{tx.paymentGateway || tx.paymentMode}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={tx.status === 'success' ? 'success' : tx.status === 'pending' ? 'info' : 'danger'} withDot>
                        {tx.status || 'success'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-500 text-xs">
                      {new Date(tx.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const user = getUser();

  if (!user || user.role !== 'superadmin') {
    return null;
  }

  const links = [
    { to: '/superadmin', label: 'Overview', icon: Building2 },
    { to: '/superadmin/schools', label: 'Schools', icon: Building2 },
    { to: '/superadmin/students', label: 'Students & Parents', icon: Users },
    { to: '/superadmin/transactions', label: 'Financials & Calls', icon: CreditCard },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Persistent Sidebar */}
      <Sidebar />

      {/* Mobile Off-canvas Drawer */}
      <MobileNavDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        links={links}
        title="Super Admin Panel"
        subtitle={user?.name || user?.email}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="lg:hidden h-14 bg-slate-900 text-white px-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>
            <span className="font-bold text-sm">Super Admin</span>
          </div>
          <button onClick={logout} className="p-1.5 text-rose-400 hover:text-rose-300 text-xs font-semibold">
            Sign Out
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/schools" element={<SchoolsPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/transactions" element={<FinancialsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
