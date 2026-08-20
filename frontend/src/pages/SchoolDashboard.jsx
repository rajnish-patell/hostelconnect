import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, Phone, Wallet, LogOut, Plus, Power, UserPlus, Menu, Building, Edit2, Trash2, Coins, LayoutDashboard } from 'lucide-react';
import api from '../api';
import { getUser, logout } from '../utils/auth';
import DashboardLayout from '../components/DashboardLayout';
import MobileNavDrawer from '../components/MobileNavDrawer';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';
import { Card, CardContent } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ResponsiveTable from '../components/ui/ResponsiveTable';
import { validateText, validatePassword, validatePhone, validateNumber } from '../utils/validation';

function Sidebar() {
  const location = useLocation();
  const user = getUser();

  const links = [
    { to: '/school', label: 'Overview', icon: Building },
    { to: '/school/students', label: 'Students & Parents', icon: Users },
    { to: '/school/pricing', label: 'Call Pricing', icon: Coins },
    { to: '/school/calls', label: 'Call History', icon: Phone },
    { to: '/school/recharge', label: 'Student Recharge', icon: Wallet },
  ];

  return (
    <div className="hidden lg:flex w-64 bg-slate-900 text-white min-h-screen flex-col shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white shadow-sm">
          <Building size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold leading-tight text-white truncate">{user?.name || 'School Portal'}</h1>
          <p className="text-[11px] text-slate-400 font-medium font-mono">{user?.schoolCode || 'SCH001'}</p>
        </div>
      </div>

      {/* Nav Links */}
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

      {/* Footer */}
      <div className="p-3.5 border-t border-slate-800/80">
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
  const [students, setStudents] = useState([]);
  const [pricing, setPricing] = useState({ perMinuteCharge: 2.5, minCallDurationMins: 5, maxCallDurationMins: 60 });
  const user = getUser();

  useEffect(() => {
    api.get('/students').then((res) => setStudents(res.data.data || [])).catch(() => {});
    if (user?.schoolId) {
      api.get(`/schools/${user.schoolId}/pricing`)
        .then((res) => {
          if (res.data.data) setPricing(res.data.data);
        })
        .catch(() => {});
    }
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">School Overview</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Hostel resident calling and student management</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/school/pricing">
            <Button variant="secondary" size="sm" icon={Coins}>Edit Call Pricing</Button>
          </Link>
          <Link to="/school/students">
            <Button variant="primary" size="sm" icon={Plus}>Add Student</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard
          title="Total Students"
          value={students.length}
          subtitle="Enrolled resident students"
          icon={Users}
          iconBg="bg-brand-50 text-brand-600 border border-brand-100"
        />
        <StatCard
          title="Active Students"
          value={students.filter((s) => s.isActive).length}
          subtitle="Authorized for calling"
          icon={Users}
          iconBg="bg-emerald-50 text-emerald-600 border border-emerald-100"
        />
        <StatCard
          title="Total Wallet Balance"
          value={`₹${students.reduce((acc, s) => acc + parseFloat(s.walletBalance || 0), 0).toFixed(2)}`}
          subtitle="Combined student wallets"
          icon={Wallet}
          iconBg="bg-indigo-50 text-indigo-600 border border-indigo-100"
        />
        <StatCard
          title="Active Call Rate"
          value={`₹${parseFloat(pricing.perMinuteCharge || 2.5).toFixed(2)}/min`}
          subtitle={`Window: ${pricing.minCallDurationMins || 5}m - ${pricing.maxCallDurationMins || 60}m`}
          icon={Coins}
          iconBg="bg-amber-50 text-amber-600 border border-amber-100"
        />
      </div>
    </div>
  );
}

function StudentsPage() {
  const [students, setStudents] = useState([]);
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

  const load = () => {
    api.get('/students').then((res) => setStudents(res.data.data || [])).catch(() => {});
  };

  useEffect(() => { load(); }, []);

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
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create student');
    } finally {
      setLoading(false);
    }
  };

  const openEditStudentModal = (student) => {
    setEditingStudent(student);
    setEditForm({
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
        studentId: editForm.studentId.trim(),
        name: editForm.name.trim(),
        classSection: editForm.classSection.trim(),
        roomNo: editForm.roomNo.trim(),
        password: editForm.password ? editForm.password.trim() : undefined,
      });
      toast.success('Student updated successfully!');
      setEditingStudent(null);
      load();
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
      load();
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
      load();
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
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlink parent');
    }
  };

  const toggleStatus = async (id) => {
    try {
      await api.patch(`/students/${id}/status`);
      toast.success('Student status updated');
      load();
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
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage hostel residents and authorized parent contacts</p>
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
        title="Add New Student"
        subtitle="Create student profile and link primary guardian contact"
      >
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              label="Student Password"
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
              placeholder="e.g. Mr. Ramesh Sharma"
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
        title="Add Parent / Guardian"
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

      {/* Students — Responsive Table/Cards */}
      <Card className="overflow-hidden">
        {students.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students found"
            description="Click 'Add Student' to register hostel residents."
            actionLabel="Add Student"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <ResponsiveTable
            columns={[
              { key: 'studentId', label: 'Student ID' },
              { key: 'name', label: 'Name' },
              { key: 'classSection', label: 'Class', hideOnMobile: true },
              { key: 'roomNo', label: 'Room', hideOnMobile: true },
              { key: 'wallet', label: 'Wallet' },
              { key: 'parents', label: 'Linked Parents', hideOnMobile: true },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Actions', className: 'text-right', hideOnMobile: true },
            ]}
            data={students}
            keyField="id"
            renderCell={(s, col) => {
              switch (col.key) {
                case 'studentId': return <span className="font-bold text-brand-700 font-mono">{s.studentId}</span>;
                case 'name': return <span className="font-semibold text-slate-900">{s.name}</span>;
                case 'classSection': return <span className="text-slate-600">{s.classSection || '—'}</span>;
                case 'roomNo': return <span className="text-slate-600">{s.roomNo || '—'}</span>;
                case 'wallet': return <span className="font-bold text-slate-900 font-mono">₹{parseFloat(s.walletBalance || 0).toFixed(2)}</span>;
                case 'parents': return (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {s.parents && s.parents.length > 0 ? (
                      s.parents.map((p) => (
                        <button key={p.id} type="button" onClick={() => openEditParentModal(p.parent, s.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition" title="Click to edit parent contact">
                          <span>{p.parent?.name || p.parent?.mobile} ({p.parent?.relation})</span>
                          <Edit2 size={10} className="text-slate-400" />
                        </button>
                      ))
                    ) : <span className="text-xs text-slate-400">None</span>}
                    <button onClick={() => { setParentModalStudent(s); setParentErrors({}); }}
                      className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700 font-semibold px-2 py-0.5 rounded-md bg-brand-50 hover:bg-brand-100/70 border border-brand-200 transition cursor-pointer" title="Add another parent">
                      <UserPlus size={12} /> + Parent
                    </button>
                  </div>
                );
                case 'status': return <Badge variant={s.isActive ? 'success' : 'danger'} withDot>{s.isActive ? 'Active' : 'Inactive'}</Badge>;
                case 'actions': return (
                  <div className="flex items-center justify-end gap-1.5">
                    <Button variant="secondary" size="sm" icon={Edit2} onClick={() => openEditStudentModal(s)} className="text-slate-700 hover:text-brand-700">Edit</Button>
                    <Button variant="ghost" size="sm" icon={Power} onClick={() => toggleStatus(s.id)} className="text-slate-600 hover:text-slate-900">Toggle</Button>
                  </div>
                );
                default: return null;
              }
            }}
            renderMobileCard={(s) => (
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-card overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-slate-100">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{s.name}</p>
                    <p className="text-[11px] font-mono text-brand-700 font-bold">{s.studentId}</p>
                  </div>
                  <Badge variant={s.isActive ? 'success' : 'danger'} withDot>{s.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Class / Room</span>
                    <span className="text-sm font-medium text-slate-700">{s.classSection || '—'} / {s.roomNo || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Wallet</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">₹{parseFloat(s.walletBalance || 0).toFixed(2)}</span>
                  </div>
                  <div className="px-4 py-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1.5">Parents</span>
                    <div className="flex flex-wrap gap-1.5">
                      {s.parents && s.parents.length > 0 ? (
                        s.parents.map((p) => (
                          <button key={p.id} type="button" onClick={() => openEditParentModal(p.parent, s.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition">
                            <span>{p.parent?.name || p.parent?.mobile}</span>
                            <Edit2 size={10} className="text-slate-400" />
                          </button>
                        ))
                      ) : <span className="text-xs text-slate-400">None linked</span>}
                      <button onClick={() => { setParentModalStudent(s); setParentErrors({}); }}
                        className="inline-flex items-center gap-1 text-[11px] text-brand-600 font-semibold px-2 py-1 rounded-md bg-brand-50 border border-brand-200 cursor-pointer">
                        <UserPlus size={12} /> Add
                      </button>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2">
                  <Button variant="secondary" size="sm" icon={Edit2} onClick={() => openEditStudentModal(s)} className="flex-1">Edit</Button>
                  <Button variant="ghost" size="sm" icon={Power} onClick={() => toggleStatus(s.id)} className="flex-1">Toggle</Button>
                </div>
              </div>
            )}
          />
        )}
      </Card>
    </div>
  );
}

function CallsPage() {
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    api.get('/calls/history').then((res) => setCalls(res.data.data || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Call History</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Historical calling records, durations, and student wallet deductions</p>
      </div>

      <Card className="overflow-hidden">
        {calls.length === 0 ? (
          <EmptyState
            icon={Phone}
            title="No calls recorded"
            description="Completed video call sessions will appear here automatically."
          />
        ) : (
          <ResponsiveTable
            columns={[
              { key: 'student', label: 'Student' },
              { key: 'parent', label: 'Parent' },
              { key: 'duration', label: 'Duration' },
              { key: 'charge', label: 'Charge' },
              { key: 'status', label: 'Status' },
              { key: 'date', label: 'Date & Time', className: 'text-right' },
            ]}
            data={calls}
            keyField="id"
            renderCell={(c, col) => {
              switch (col.key) {
                case 'student': return <span className="font-semibold text-slate-900">{c.student?.name}</span>;
                case 'parent': return <span className="text-slate-600">{c.parent?.name || c.parent?.mobile}</span>;
                case 'duration': return <span className="font-mono text-slate-700">{Math.floor(c.durationSeconds / 60)}m {c.durationSeconds % 60}s</span>;
                case 'charge': return <span className="font-bold text-slate-900 font-mono">₹{c.chargeAmount}</span>;
                case 'status': return <Badge variant="neutral">{c.status}</Badge>;
                case 'date': return <span className="text-slate-500 text-xs">{new Date(c.createdAt).toLocaleString()}</span>;
                default: return null;
              }
            }}
            renderMobileCard={(c) => (
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-card overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-slate-100">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{c.student?.name}</p>
                    <p className="text-xs text-slate-500">{c.parent?.name || c.parent?.mobile}</p>
                  </div>
                  <Badge variant="neutral">{c.status}</Badge>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Duration</span>
                    <span className="text-sm font-mono text-slate-700">{Math.floor(c.durationSeconds / 60)}m {c.durationSeconds % 60}s</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Charge</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">₹{c.chargeAmount}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Date</span>
                    <span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          />
        )}
      </Card>
    </div>
  );
}

function RechargePage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ studentId: '', amount: '', notes: '' });

  useEffect(() => {
    api.get('/students').then((res) => setStudents(res.data.data || [])).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateRecharge = () => {
    const errs = {};
    if (!form.studentId) errs.studentId = 'Please select a student';
    const amountErr = validateNumber(form.amount, 1, 50000, 'Recharge amount', true);
    if (amountErr) errs.amount = amountErr;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRecharge = async (e) => {
    e.preventDefault();
    if (!validateRecharge()) return;

    setLoading(true);
    try {
      await api.post('/recharge/manual', {
        studentId: form.studentId,
        amount: parseFloat(form.amount),
        notes: form.notes.trim(),
        paymentMode: 'school_cash',
      });
      toast.success('Recharge successful!');
      setForm({ studentId: '', amount: '', notes: '' });
      setErrors({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Manual Student Recharge</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Credit student wallet balance directly from cash collection</p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleRecharge} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Student <span className="text-rose-500">*</span>
              </label>
              <select
                name="studentId"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20"
                value={form.studentId}
                onChange={handleChange}
                required
              >
                <option value="">Choose resident student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.studentId} – {s.name} (Balance: ₹{parseFloat(s.walletBalance || 0).toFixed(2)})
                  </option>
                ))}
              </select>
              {errors.studentId && <p className="text-xs text-rose-500 mt-1">{errors.studentId}</p>}
            </div>

            <Input
              label="Recharge Amount (₹)"
              name="amount"
              type="number"
              min="1"
              max="50000"
              step="1"
              placeholder="e.g. 200"
              value={form.amount}
              onChange={handleChange}
              error={errors.amount}
              required
            />

            <Input
              label="Internal Notes"
              name="notes"
              placeholder="e.g. Cash collected from parents at hostel reception"
              value={form.notes}
              onChange={handleChange}
              maxLength={250}
            />

            <Button type="submit" variant="primary" size="lg" isLoading={loading} className="w-full mt-2">
              Credit Wallet Balance
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PricingPage() {
  const user = getUser();
  const [pricing, setPricing] = useState({
    perMinuteCharge: 2.5,
    minCallDurationMins: 5,
    maxCallDurationMins: 60,
    callDurationMins: 10,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user?.schoolId) {
      setLoading(true);
      api.get(`/schools/${user.schoolId}/pricing`)
        .then((res) => {
          if (res.data.data) {
            const d = res.data.data;
            setPricing({
              perMinuteCharge: d.perMinuteCharge !== undefined ? d.perMinuteCharge : 2.5,
              minCallDurationMins: d.minCallDurationMins || 5,
              maxCallDurationMins: d.maxCallDurationMins || 60,
              callDurationMins: d.callDurationMins || 10,
            });
          }
        })
        .catch(() => toast.error('Failed to load active pricing'))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPricing((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    const price = parseFloat(pricing.perMinuteCharge);
    if (isNaN(price) || price <= 0) {
      errs.perMinuteCharge = 'Price per minute must be greater than ₹0';
    } else if (price > 1000) {
      errs.perMinuteCharge = 'Price per minute must be reasonable (max ₹1000)';
    }

    const minDur = parseInt(pricing.minCallDurationMins, 10);
    if (isNaN(minDur) || minDur < 1) {
      errs.minCallDurationMins = 'Minimum call duration must be at least 1 minute';
    }

    const maxDur = parseInt(pricing.maxCallDurationMins, 10);
    if (isNaN(maxDur) || maxDur < minDur) {
      errs.maxCallDurationMins = 'Maximum duration must be greater than or equal to minimum duration';
    } else if (maxDur > 240) {
      errs.maxCallDurationMins = 'Maximum duration cannot exceed 240 minutes';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await api.put(`/schools/${user.schoolId}/pricing`, {
        perMinuteCharge: parseFloat(pricing.perMinuteCharge),
        minCallDurationMins: parseInt(pricing.minCallDurationMins, 10),
        maxCallDurationMins: parseInt(pricing.maxCallDurationMins, 10),
        callDurationMins: parseInt(pricing.callDurationMins || pricing.minCallDurationMins, 10),
      });
      toast.success('Video call pricing updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update pricing');
    } finally {
      setSaving(false);
    }
  };

  const priceNum = parseFloat(pricing.perMinuteCharge) || 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Video Call Pricing Settings</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure school-specific per-minute video calling rates and call duration boundaries
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Form Card */}
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <form onSubmit={handleSave} noValidate className="space-y-5">
              <Input
                label="Price Per Minute (₹)"
                name="perMinuteCharge"
                type="number"
                step="0.10"
                min="0.10"
                max="1000"
                placeholder="e.g. 2.50"
                value={pricing.perMinuteCharge}
                onChange={handleChange}
                error={errors.perMinuteCharge}
                helperText="This exact rate is authoritatively enforced on all parent bookings and calls for this school."
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Minimum Call Duration (Minutes)"
                  name="minCallDurationMins"
                  type="number"
                  min="1"
                  max="120"
                  placeholder="e.g. 5"
                  value={pricing.minCallDurationMins}
                  onChange={handleChange}
                  error={errors.minCallDurationMins}
                  required
                />

                <Input
                  label="Maximum Call Duration (Minutes)"
                  name="maxCallDurationMins"
                  type="number"
                  min="1"
                  max="240"
                  placeholder="e.g. 60"
                  value={pricing.maxCallDurationMins}
                  onChange={handleChange}
                  error={errors.maxCallDurationMins}
                  required
                />
              </div>

              <Input
                label="Default Suggested Duration (Minutes)"
                name="callDurationMins"
                type="number"
                min="1"
                max="240"
                placeholder="e.g. 10"
                value={pricing.callDurationMins}
                onChange={handleChange}
                helperText="Pre-selected duration when parents open the booking tab."
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={saving}
                className="w-full sm:w-auto"
              >
                Save Video Call Pricing
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Live Preview Card */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="brand" className="bg-brand-500/20 text-brand-200 border-brand-400/30">
                Live Pricing Snapshot
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Call Rate</p>
              <p className="text-3xl font-black text-white font-mono">
                ₹{priceNum.toFixed(2)} <span className="text-xs font-medium text-slate-400">/ min</span>
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Allowed Window:</span>
                <span className="font-bold text-white">{pricing.minCallDurationMins || 5}m - {pricing.maxCallDurationMins || 60}m</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>15 Min Session:</span>
                <span className="font-mono font-bold text-emerald-400">₹{(15 * priceNum).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>30 Min Session:</span>
                <span className="font-mono font-bold text-emerald-400">₹{(30 * priceNum).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>60 Min Session:</span>
                <span className="font-mono font-bold text-emerald-400">₹{(60 * priceNum).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-800 space-y-1">
            <p className="font-bold">🔒 Secure & Immutable Billing</p>
            <p className="leading-relaxed">
              When you update pricing, existing completed payments remain untouched in historical records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SchoolDashboard() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const user = getUser();

  if (!user || user.role !== 'school') {
    return null;
  }

  const links = [
    { to: '/school', label: 'Overview', icon: LayoutDashboard },
    { to: '/school/students', label: 'Students & Parents', icon: Users },
    { to: '/school/pricing', label: 'Call Pricing', icon: Coins },
    { to: '/school/calls', label: 'Call History', icon: Phone },
    { to: '/school/recharge', label: 'Student Recharge', icon: Wallet },
  ];

  return (
    <DashboardLayout
      navLinks={links}
      title="School Management Panel"
      subtitle={`${user?.name || 'School'} (Code: ${user?.schoolCode || 'SCH001'})`}
    >
      <div className="max-w-6xl mx-auto">
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/calls" element={<CallsPage />} />
          <Route path="/recharge" element={<RechargePage />} />
        </Routes>
      </div>
    </DashboardLayout>
  );
}
