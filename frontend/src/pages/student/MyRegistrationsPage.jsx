import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { registrationService } from '../../api/services/registrationService';
import { attendeeService } from '../../api/services/attendeeService';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { QRRegistrationPassModal } from '../../components/attendee/QRRegistrationPassModal';
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
  CheckCircle2,
  Ticket,
  Users,
  Sparkles,
  QrCode
} from 'lucide-react';

export const MyRegistrationsPage = () => {
  const { showToast } = useToast();

  // Active Main Tab: 'volunteers' or 'attendees'
  const [activeMainTab, setActiveMainTab] = useState('volunteers');

  // Volunteer applications state
  const [registrations, setRegistrations] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Attendee bookings state
  const [attendingEvents, setAttendingEvents] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(true);

  // QR Pass modal state (supports both 'attendee' and 'volunteer')
  const [selectedPass, setSelectedPass] = useState(null);

  // Cancel modals
  const [selectedRegToCancel, setSelectedRegToCancel] = useState(null);
  const [cancellingVolunteer, setCancellingVolunteer] = useState(false);

  const [selectedAttendeeToCancel, setSelectedAttendeeToCancel] = useState(null);
  const [cancellingAttendee, setCancellingAttendee] = useState(false);



  // Fetch Volunteer Registrations
  const fetchVolunteerRegistrations = useCallback(async () => {
    setLoadingVolunteers(true);
    try {
      const res = await registrationService.getMyRegistrations({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      if (res?.success) {
        setRegistrations(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load volunteer applications', 'error');
    } finally {
      setLoadingVolunteers(false);
    }
  }, [statusFilter, showToast]);

  // Fetch Attendee Bookings
  const fetchAttendeeBookings = useCallback(async () => {
    setLoadingAttendees(true);
    try {
      const res = await attendeeService.getMyAttendingEvents();
      if (res?.success) {
        setAttendingEvents(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load attendee bookings', 'error');
    } finally {
      setLoadingAttendees(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchVolunteerRegistrations();
  }, [fetchVolunteerRegistrations]);

  useEffect(() => {
    fetchAttendeeBookings();
  }, [fetchAttendeeBookings]);

  // Cancel Volunteer Registration
  const handleCancelVolunteer = async () => {
    if (!selectedRegToCancel) return;
    setCancellingVolunteer(true);
    try {
      const res = await registrationService.cancelRegistration(selectedRegToCancel.registration_id);
      if (res?.success) {
        showToast('Volunteer application withdrawn successfully.', 'info');
        setSelectedRegToCancel(null);
        fetchVolunteerRegistrations();
      }
    } catch (err) {
      showToast(err.message || 'Failed to cancel volunteer application', 'error');
    } finally {
      setCancellingVolunteer(false);
    }
  };

  // Cancel Attendee Booking
  const handleCancelAttendee = async () => {
    if (!selectedAttendeeToCancel) return;
    setCancellingAttendee(true);
    try {
      const res = await attendeeService.cancelAttendeeRegistration(selectedAttendeeToCancel.event_id);
      if (res?.success) {
        showToast('Attendee registration cancelled and seat released.', 'info');
        setSelectedAttendeeToCancel(null);
        fetchAttendeeBookings();
      }
    } catch (err) {
      showToast(err.message || 'Failed to cancel attendee seat', 'error');
    } finally {
      setCancellingAttendee(false);
    }
  };

  const volunteerStatusTabs = [
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
            My Event Registrations & Bookings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your attendee seats and track volunteer application approvals.
          </p>
        </div>
        <Link
          to="/events"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl self-start sm:self-auto shadow-sm"
        >
          Explore More Events
        </Link>
      </div>

      {/* Main Mode Toggle: Volunteer vs Attendee */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setActiveMainTab('volunteers')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'volunteers'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Volunteer Applications ({registrations.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('attendees')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'attendees'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Attendee Bookings ({attendingEvents.length})</span>
        </button>
      </div>

      {/* VIEW 1: VOLUNTEER APPLICATIONS */}
      {activeMainTab === 'volunteers' && (
        <div className="space-y-4">
          {/* Volunteer Status Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {volunteerStatusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === tab.value
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loadingVolunteers ? (
            <LoadingSpinner text="Loading your volunteer applications..." />
          ) : registrations.length === 0 ? (
            <EmptyState
              title="No Volunteer Applications"
              description={`No ${statusFilter !== 'all' ? statusFilter : ''} volunteer applications found in your account.`}
              actionLabel="Browse Open Volunteer Positions"
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
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700">
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
                        className="text-lg font-bold text-slate-900 hover:text-purple-600 transition-colors flex items-center gap-1.5"
                      >
                        <span>{reg.event_title}</span>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </Link>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-purple-500" />
                          {new Date(reg.event_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-purple-500" />
                          {reg.start_time.slice(0, 5)} - {reg.end_time.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-purple-500" />
                          {reg.venue}
                        </span>
                      </div>
                    </div>

                    {/* Cancel Volunteer Trigger */}
                    {reg.registration_status !== 'cancelled' && (
                      <button
                        onClick={() => setSelectedRegToCancel(reg)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl transition-colors self-start"
                      >
                        Withdraw Application
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
                    <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-purple-900">
                      <span className="font-bold block mb-1">Coordinator Remarks:</span>
                      <p>{reg.organizer_remarks}</p>
                    </div>
                  )}

                  {/* Volunteer Card Actions & Coordinator Contacts */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex flex-wrap items-center gap-2">
                      {reg.registration_status?.toLowerCase() === 'approved' && (
                        <button
                          onClick={() =>
                            setSelectedPass({
                              passType: 'volunteer',
                              eventId: reg.event_id,
                              registrationId: reg.registration_id,
                            })
                          }
                          className="px-3.5 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-all flex items-center gap-1.5 shadow-xs"
                        >
                          <QrCode className="w-3.5 h-3.5 text-purple-600" />
                          <span>View Volunteer QR Pass</span>
                        </button>
                      )}

                      {reg.registration_status?.toLowerCase() === 'pending' && (
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pass Available Upon Approval</span>
                        </span>
                      )}


                      <Link
                        to={`/events/${reg.event_id}`}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <span>Event Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

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
        </div>
      )}

      {/* VIEW 2: ATTENDEE BOOKINGS */}
      {activeMainTab === 'attendees' && (
        <div className="space-y-4">
          {loadingAttendees ? (
            <LoadingSpinner text="Loading your attendee bookings..." />
          ) : attendingEvents.length === 0 ? (
            <EmptyState
              title="No Attendee Bookings"
              description="You have not reserved attendee seats for any campus events yet."
              actionLabel="Browse Available Events"
              onAction={() => window.location.href = '/events'}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attendingEvents.map((evt) => (
                <div
                  key={evt.attendee_registration_id}
                  className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px]">
                        {evt.category_name || 'Event'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Seat Confirmed</span>
                      </span>
                    </div>

                    <Link
                      to={`/events/${evt.event_id}`}
                      className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1 block"
                    >
                      {evt.event_title}
                    </Link>

                    <div className="space-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{new Date(evt.event_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{evt.start_time.slice(0, 5)} - {evt.end_time.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{evt.venue}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                      <span>Organizer: <strong>{evt.organizer_name}</strong></span>
                      <span className="text-[11px] text-slate-400">
                        Booked: {new Date(evt.registered_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setSelectedPass({
                            passType: 'attendee',
                            eventId: evt.event_id,
                            registrationId: evt.attendee_registration_id,
                          })
                        }
                        className="px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                        <span>View Attendee QR Pass</span>
                      </button>

                      <Link
                        to={`/events/${evt.event_id}`}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <span>Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <button
                      onClick={() => setSelectedAttendeeToCancel(evt)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
                    >
                      Cancel Seat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Withdraw Volunteer Application */}
      <ConfirmModal
        isOpen={Boolean(selectedRegToCancel)}
        onClose={() => setSelectedRegToCancel(null)}
        onConfirm={handleCancelVolunteer}
        title="Withdraw Volunteer Application"
        message={`Are you sure you want to withdraw your volunteer application for "${selectedRegToCancel?.event_title}"?`}
        confirmText="Confirm Withdrawal"
        isDanger={true}
        loading={cancellingVolunteer}
      />

      {/* Modal 2: Cancel Attendee Seat Booking */}
      <ConfirmModal
        isOpen={Boolean(selectedAttendeeToCancel)}
        onClose={() => setSelectedAttendeeToCancel(null)}
        onConfirm={handleCancelAttendee}
        title="Cancel Attendee Seat"
        message={`Are you sure you want to cancel your attendee seat for "${selectedAttendeeToCancel?.event_title}"? Your seat will be made available for other students.`}
        confirmText="Release My Seat"
        isDanger={true}
        loading={cancellingAttendee}
      />

      {/* Modal 3: Attendee & Volunteer QR Registration Pass Modal */}
      <QRRegistrationPassModal
        isOpen={Boolean(selectedPass)}
        onClose={() => setSelectedPass(null)}
        passType={selectedPass?.passType || 'attendee'}
        eventId={selectedPass?.eventId}
        registrationId={selectedPass?.registrationId}
      />
    </div>
  );
};
