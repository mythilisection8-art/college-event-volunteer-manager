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
  Edit3
} from 'lucide-react';

export const RegistrationManagementPage = () => {
  const { showToast } = useToast();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
        page: currentPage,
        limit: 12,
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      if (res?.success) {
        setRegistrations(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch global registrations', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, showToast]);

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
      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          System-Wide Registration Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Comprehensive log and moderation of all student volunteer registrations across campus events.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
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

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
        >
          <option value="all">All Application Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Loading registration records..." />
      ) : registrations.length === 0 ? (
        <EmptyState
          title="No Registrations Found"
          description="No application records match your filter criteria."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Student Applicant</th>
                  <th className="py-3.5 px-6">Event</th>
                  <th className="py-3.5 px-6">Applied Date</th>
                  <th className="py-3.5 px-6">Status & Attendance</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {registrations.map((reg) => (
                  <tr key={reg.registration_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Student Applicant */}
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900">{reg.student_name}</p>
                      <p className="text-[11px] text-slate-400">
                        {reg.student_department} • Roll: {reg.student_roll_number || 'N/A'}
                      </p>
                    </td>

                    {/* Event */}
                    <td className="py-4 px-6 max-w-xs">
                      <p className="font-bold text-slate-800 line-clamp-1">{reg.event_title}</p>
                      <p className="text-[11px] text-slate-400">Host: {reg.organizer_name}</p>
                    </td>

                    {/* Applied Date */}
                    <td className="py-4 px-6 text-slate-500">
                      {new Date(reg.registered_at).toLocaleDateString()}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 space-y-1">
                      <div>
                        <Badge status={reg.registration_status} size="sm" />
                      </div>
                      {reg.attendance_status !== 'not_marked' && (
                        <div>
                          <Badge status={reg.attendance_status} text={reg.attendance_status} size="sm" />
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => openEditModal(reg)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Override</span>
                      </button>
                    </td>
                  </tr>
                ))}
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

      {/* Edit Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Admin Override: Registration Status"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-xl text-xs">
            <p className="font-bold text-slate-900">{selectedReg?.student_name}</p>
            <p className="text-slate-500">Event: {selectedReg?.event_title}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Registration Status
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
