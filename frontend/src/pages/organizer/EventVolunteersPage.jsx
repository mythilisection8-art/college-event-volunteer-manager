import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { registrationService } from '../../api/services/registrationService';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  ArrowLeft,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Phone,
  Mail,
  Building,
  Hash,
  MessageSquare,
  Award
} from 'lucide-react';

export const EventVolunteersPage = () => {
  const { id } = useParams();
  const { showToast } = useToast();

  const [eventData, setEventData] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Status Action Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [targetStatus, setTargetStatus] = useState('approved');
  const [remarks, setRemarks] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Attendance Modal State
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [targetAttendance, setTargetAttendance] = useState('present');

  const fetchVolunteers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await registrationService.getEventRegistrations(id);
      if (res?.success) {
        setEventData(res.event);
        setVolunteers(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load event volunteers', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  // Open Approve / Reject Modal
  const openStatusModal = (volunteer, newStatus) => {
    setSelectedVolunteer(volunteer);
    setTargetStatus(newStatus);
    setRemarks(volunteer.organizer_remarks || '');
    setStatusModalOpen(true);
  };

  // Submit Status Change (Approve/Reject)
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVolunteer) return;

    setSubmittingAction(true);
    try {
      const res = await registrationService.updateRegistrationStatus(
        selectedVolunteer.registration_id,
        {
          status: targetStatus,
          remarks: remarks.trim() || undefined,
        }
      );
      if (res?.success) {
        showToast(res.message || `Applicant marked as ${targetStatus.toUpperCase()}`, 'success');
        setStatusModalOpen(false);
        fetchVolunteers();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update applicant status', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Open Attendance Modal
  const openAttendanceModal = (volunteer) => {
    setSelectedVolunteer(volunteer);
    setTargetAttendance(volunteer.attendance_status !== 'not_marked' ? volunteer.attendance_status : 'present');
    setRemarks(volunteer.organizer_remarks || '');
    setAttendanceModalOpen(true);
  };

  // Submit Attendance Change
  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVolunteer) return;

    setSubmittingAction(true);
    try {
      const res = await registrationService.updateAttendance(
        selectedVolunteer.registration_id,
        {
          attendance_status: targetAttendance,
          remarks: remarks.trim() || undefined,
        }
      );
      if (res?.success) {
        showToast('Volunteer attendance updated successfully!', 'success');
        setAttendanceModalOpen(false);
        fetchVolunteers();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update attendance', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const filteredVolunteers = volunteers.filter((v) => {
    const matchesSearch =
      v.student_name.toLowerCase().includes(search.toLowerCase()) ||
      v.student_email.toLowerCase().includes(search.toLowerCase()) ||
      (v.student_roll_number && v.student_roll_number.toLowerCase().includes(search.toLowerCase())) ||
      (v.student_department && v.student_department.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || v.registration_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Back button & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/organizer/events"
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Manage Event Volunteers
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Event: <strong className="text-slate-800">{eventData?.title || 'Loading...'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Event Capacity & Metrics Banner */}
      {eventData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-bold uppercase text-slate-400">Total Applicants</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{eventData.total_applicants}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs bg-emerald-50/30">
            <p className="text-[11px] font-bold uppercase text-emerald-700">Approved Volunteers</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              {eventData.approved_count} / {eventData.max_volunteers}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs bg-amber-50/30">
            <p className="text-[11px] font-bold uppercase text-amber-700">Pending Review</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{eventData.pending_count}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs bg-rose-50/30">
            <p className="text-[11px] font-bold uppercase text-rose-700">Rejected</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">{eventData.rejected_count}</p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, roll number, department, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="all">All Applications ({volunteers.length})</option>
          <option value="pending">Pending ({eventData?.pending_count || 0})</option>
          <option value="approved">Approved ({eventData?.approved_count || 0})</option>
          <option value="rejected">Rejected ({eventData?.rejected_count || 0})</option>
        </select>
      </div>

      {/* Volunteers Table */}
      {loading ? (
        <LoadingSpinner text="Loading applicant list..." />
      ) : filteredVolunteers.length === 0 ? (
        <EmptyState
          title="No Applicants Found"
          description="No volunteer applications matching your search query or status filter."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Student Info</th>
                  <th className="py-3.5 px-6">Department & Roll</th>
                  <th className="py-3.5 px-6">Applied Skills / Notes</th>
                  <th className="py-3.5 px-6">Status & Attendance</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredVolunteers.map((vol) => (
                  <tr key={vol.registration_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Student Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {vol.student_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{vol.student_name}</p>
                          <p className="text-[11px] text-slate-400">{vol.student_email}</p>
                          {vol.student_phone && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" /> {vol.student_phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Department & Roll */}
                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-800">{vol.student_department || 'N/A'}</p>
                      <p className="text-[11px] text-slate-400">Roll: {vol.student_roll_number || 'N/A'}</p>
                    </td>

                    {/* Skills / Notes */}
                    <td className="py-4 px-6 max-w-xs">
                      {vol.skills_notes ? (
                        <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                          "{vol.skills_notes}"
                        </p>
                      ) : (
                        <span className="text-[11px] text-slate-300">No notes provided</span>
                      )}
                      {vol.organizer_remarks && (
                        <p className="text-[10px] text-indigo-600 font-medium mt-1">
                          Remarks: {vol.organizer_remarks}
                        </p>
                      )}
                    </td>

                    {/* Status & Attendance */}
                    <td className="py-4 px-6 space-y-1">
                      <div>
                        <Badge status={vol.registration_status} size="sm" />
                      </div>
                      {vol.registration_status === 'approved' && (
                        <div>
                          <Badge status={vol.attendance_status} text={`Attendance: ${vol.attendance_status}`} size="sm" />
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                      {/* Approve button */}
                      {vol.registration_status !== 'approved' && (
                        <button
                          onClick={() => openStatusModal(vol, 'approved')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition-colors text-xs"
                          title="Approve Volunteer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      )}

                      {/* Reject button */}
                      {vol.registration_status !== 'rejected' && (
                        <button
                          onClick={() => openStatusModal(vol, 'rejected')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-colors text-xs"
                          title="Reject Volunteer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      )}

                      {/* Log Attendance button (only for approved volunteers) */}
                      {vol.registration_status === 'approved' && (
                        <button
                          onClick={() => openAttendanceModal(vol)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors text-xs"
                          title="Log Attendance & Performance"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Attendance</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve / Reject Application Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={targetStatus === 'approved' ? 'Approve Volunteer Application' : 'Reject Volunteer Application'}
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div className={`p-4 rounded-xl text-xs leading-relaxed ${
            targetStatus === 'approved' ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'
          }`}>
            <p className="font-bold mb-1">
              Applicant: {selectedVolunteer?.student_name}
            </p>
            <p>
              {selectedVolunteer?.student_department} • Roll: {selectedVolunteer?.student_roll_number || 'N/A'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Organizer Feedback / Role Assignment Remarks (Optional)
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                targetStatus === 'approved'
                  ? 'e.g. Assigned to Reception & Kit Distribution desk. Report at 8:30 AM.'
                  : 'e.g. Quota for your department has been filled.'
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAction}
              className={`px-6 py-2.5 text-white font-bold text-sm rounded-xl transition-all shadow-sm ${
                targetStatus === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {submittingAction ? 'Updating...' : `Confirm ${targetStatus === 'approved' ? 'Approval' : 'Rejection'}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Attendance Modal */}
      <Modal
        isOpen={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        title={`Log Attendance: ${selectedVolunteer?.student_name}`}
      >
        <form onSubmit={handleAttendanceSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Attendance / Participation Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'present', label: 'Present / On-Duty' },
                { value: 'completed', label: 'Completed Shift' },
                { value: 'absent', label: 'Absent' },
                { value: 'not_marked', label: 'Not Marked' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => setTargetAttendance(item.value)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                    targetAttendance === item.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Performance Remarks (Optional)
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Excellent teamwork and punctuality."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAttendanceModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAction}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm"
            >
              {submittingAction ? 'Updating...' : 'Save Attendance'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
