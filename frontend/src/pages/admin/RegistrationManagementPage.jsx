import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../api/services/adminService';
import { registrationService } from '../../api/services/registrationService';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import {
  FileCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  Building,
  Edit3,
  Ticket,
  Users,
  Sparkles,
  Filter,
  Check
} from 'lucide-react';

export const RegistrationManagementPage = () => {
  const { showToast } = useToast();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filters
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'attendee' | 'volunteer'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [attendanceFilter, setAttendanceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Edit Status Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedReg, setSelectedReg] = useState(null);
  const [newStatus, setNewStatus] = useState('approved');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllRegistrations({
        type: typeFilter,
        page: currentPage,
        limit: 12,
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        attendance_status: attendanceFilter !== 'all' ? attendanceFilter : undefined,
      });
      if (res?.success) {
        setRegistrations(res.data || []);
        setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch global registrations', 'error');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, currentPage, search, statusFilter, attendanceFilter, showToast]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRegistrations();
  };

  const openEditModal = (reg) => {
    setSelectedReg(reg);
    setNewStatus(reg.registration_status);
    setRemarks(reg.remarks || '');
    setStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReg) return;

    setSubmitting(true);
    try {
      const res = await registrationService.updateRegistrationStatus(
        selectedReg.registration_id,
        {
          status: newStatus,
          remarks: remarks.trim() || undefined,
        }
      );
      if (res?.success) {
        showToast(res.message || 'Status updated successfully', 'success');
        setStatusModalOpen(false);
        fetchRegistrations();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update registration status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-indigo-600" />
            <span>System-Wide Registrations & Attendance</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete database of student attendee seat passes and volunteer applications across all events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl">
            Total Records: {pagination.total || 0}
          </span>
        </div>
      </div>

      {/* Type Selection Tabs */}
      <div className="flex items-center p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 max-w-lg">
        <button
          onClick={() => {
            setTypeFilter('all');
            setCurrentPage(1);
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            typeFilter === 'all'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>All Registrations</span>
        </button>
        <button
          onClick={() => {
            setTypeFilter('attendee');
            setCurrentPage(1);
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            typeFilter === 'attendee'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ticket className="w-3.5 h-3.5 text-indigo-500" />
          <span>Attendee Passes</span>
        </button>
        <button
          onClick={() => {
            setTypeFilter('volunteer');
            setCurrentPage(1);
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            typeFilter === 'volunteer'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-purple-500" />
          <span>Volunteer Applications</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, email, roll number, or event title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 md:flex-initial px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
          >
            <option value="all">All Registration Statuses</option>
            <option value="registered">Registered (Attendee)</option>
            <option value="approved">Approved (Volunteer)</option>
            <option value="pending">Pending (Volunteer)</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={attendanceFilter}
            onChange={(e) => {
              setAttendanceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 md:flex-initial px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
          >
            <option value="all">All Attendance</option>
            <option value="present">Present (Checked In)</option>
            <option value="not_marked">Not Marked</option>
            <option value="absent">Absent</option>
            <option value="completed">Completed Shift</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Loading registration records..." />
      ) : registrations.length === 0 ? (
        <EmptyState
          title="No Registrations Found"
          description="No registration records match your filter criteria."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6">Student Applicant</th>
                  <th className="py-3.5 px-6">Event</th>
                  <th className="py-3.5 px-6">Registered Date</th>
                  <th className="py-3.5 px-6">Registration Status</th>
                  <th className="py-3.5 px-6">Gate Attendance</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {registrations.map((reg) => {
                  const isAttendee = reg.record_type === 'attendee';
                  const isPresent = reg.attendance_status === 'present' || reg.attendance_status === 'completed';

                  return (
                    <tr key={`${reg.record_type}-${reg.registration_id}`} className="hover:bg-slate-50/80 transition-colors">
                      {/* Type Badge */}
                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-lg inline-flex items-center gap-1 ${
                            isAttendee
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {isAttendee ? (
                            <>
                              <Ticket className="w-3 h-3 text-indigo-500" />
                              <span>Attendee</span>
                            </>
                          ) : (
                            <>
                              <Users className="w-3 h-3 text-purple-500" />
                              <span>Volunteer</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Student Applicant */}
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">{reg.student_name}</p>
                        <p className="text-[11px] text-slate-400">
                          {reg.student_department || 'General'} • Roll: {reg.student_roll_number || 'N/A'}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{reg.student_email}</p>
                      </td>

                      {/* Event */}
                      <td className="py-4 px-6 max-w-xs">
                        <p className="font-bold text-slate-800 line-clamp-1">{reg.event_title}</p>
                        <p className="text-[11px] text-slate-400">
                          📅 {reg.event_date ? new Date(reg.event_date).toLocaleDateString() : 'TBA'} • Host: {reg.organizer_name || 'Admin'}
                        </p>
                      </td>

                      {/* Applied Date */}
                      <td className="py-4 px-6 text-slate-500">
                        {reg.registered_at ? new Date(reg.registered_at).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Registration Status */}
                      <td className="py-4 px-6">
                        <Badge status={reg.registration_status} size="sm" />
                      </td>

                      {/* Attendance Status */}
                      <td className="py-4 px-6">
                        {isPresent ? (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[11px] rounded-lg inline-flex items-center gap-1 shadow-xs">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Present</span>
                            </span>
                            {reg.checked_in_at && (
                              <p className="text-[10px] text-slate-400">
                                {new Date(reg.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-semibold text-[11px] rounded-lg">
                            Not Checked In
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right">
                        {!isAttendee && (
                          <button
                            onClick={() => openEditModal(reg)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Override</span>
                          </button>
                        )}
                        {isAttendee && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Auto Pass
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        </div>
      )}

      {/* Edit Status Modal for Volunteers */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Admin Override: Volunteer Application Status"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-xl text-xs">
            <p className="font-bold text-slate-900">{selectedReg?.student_name}</p>
            <p className="text-slate-500">Event: {selectedReg?.event_title}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Application Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['pending', 'approved', 'rejected'].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setNewStatus(s)}
                  className={`p-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                    newStatus === s
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Admin Remarks (Optional)
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Reason for override or instructions..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
            >
              {submitting ? 'Saving...' : 'Apply Status'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
