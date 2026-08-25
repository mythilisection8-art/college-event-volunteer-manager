import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { registrationService } from '../../api/services/registrationService';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Calendar,
  Clock,
  MapPin,
  Mail,
  Phone,
  FileText,
  AlertCircle,
  ExternalLink,
  XCircle,
  CheckCircle2
} from 'lucide-react';

export const MyRegistrationsPage = () => {
  const { showToast } = useToast();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Cancel Modal state
  const [selectedRegToCancel, setSelectedRegToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await registrationService.getMyRegistrations({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      if (res?.success) {
        setRegistrations(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load registrations', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleCancelRegistration = async () => {
    if (!selectedRegToCancel) return;
    setCancelling(true);
    try {
      const res = await registrationService.cancelRegistration(selectedRegToCancel.registration_id);
      if (res?.success) {
        showToast('Registration cancelled successfully.', 'info');
        setSelectedRegToCancel(null);
        fetchRegistrations();
      }
    } catch (err) {
      showToast(err.message || 'Failed to cancel registration', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const statusTabs = [
    { label: 'All Applications', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Event Registrations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track your volunteer application approvals, coordinator feedback, and attendance records.
          </p>
        </div>
        <Link
          to="/events"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl self-start sm:self-auto"
        >
          Find More Events
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === tab.value
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Registrations List */}
      {loading ? (
        <LoadingSpinner text="Loading registrations..." />
      ) : registrations.length === 0 ? (
        <EmptyState
          title="No Registrations Found"
          description={`No ${statusFilter !== 'all' ? statusFilter : ''} registrations found in your account.`}
          actionLabel="Browse Available Events"
          onAction={() => window.location.href = '/events'}
        />
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => (
            <div
              key={reg.registration_id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {reg.category_name && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {reg.category_name}
                      </span>
                    )}
                    <Badge status={reg.registration_status} />
                    {reg.attendance_status !== 'not_marked' && (
                      <Badge status={reg.attendance_status} text={`Attendance: ${reg.attendance_status}`} />
                    )}
                  </div>

                  <Link
                    to={`/events/${reg.event_id}`}
                    className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                  >
                    <span>{reg.event_title}</span>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </Link>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      {new Date(reg.event_date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      {reg.start_time.slice(0, 5)} - {reg.end_time.slice(0, 5)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      {reg.venue}
                    </span>
                  </div>
                </div>

                {/* Cancel Registration Trigger */}
                {reg.registration_status !== 'cancelled' && (
                  <button
                    onClick={() => setSelectedRegToCancel(reg)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl transition-colors self-start"
                  >
                    Cancel Application
                  </button>
                )}
              </div>

              {/* Skills Submitted / Notes */}
              {reg.skills_notes && (
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                  <span className="font-bold text-slate-700 block mb-0.5">Submitted Note / Skills:</span>
                  <p>{reg.skills_notes}</p>
                </div>
              )}

              {/* Organizer Remarks Feedback */}
              {reg.organizer_remarks && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900">
                  <span className="font-bold block mb-1">Coordinator Remarks:</span>
                  <p>{reg.organizer_remarks}</p>
                </div>
              )}

              {/* Coordinator Contacts & Submission info */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                <span>
                  Submitted on {new Date(reg.registered_at).toLocaleString()}
                </span>
                <div className="flex items-center gap-3 text-slate-600">
                  <span>Organizer: <strong>{reg.organizer_name}</strong></span>
                  {reg.organizer_email && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Mail className="w-3 h-3" /> {reg.organizer_email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(selectedRegToCancel)}
        onClose={() => setSelectedRegToCancel(null)}
        onConfirm={handleCancelRegistration}
        title="Withdraw Application"
        message={`Are you sure you want to cancel your registration for "${selectedRegToCancel?.event_title}"?`}
        confirmText="Confirm Cancellation"
        isDanger={true}
        loading={cancelling}
      />
    </div>
  );
};
