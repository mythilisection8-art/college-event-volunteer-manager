import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { eventService } from '../../api/services/eventService';
import { attendeeService } from '../../api/services/attendeeService';
import { registrationService } from '../../api/services/registrationService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  CheckCircle2,
  Send,
  Building,
  Mail,
  ArrowLeft,
  XCircle,
  FileText,
  Ticket,
  Sparkles,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isStudent, isOrganizer, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Attendee state
  const [submittingAttendee, setSubmittingAttendee] = useState(false);
  const [cancelAttendeeModalOpen, setCancelAttendeeModalOpen] = useState(false);

  // Volunteer state
  const [applyVolunteerModalOpen, setApplyVolunteerModalOpen] = useState(false);
  const [cancelVolunteerModalOpen, setCancelVolunteerModalOpen] = useState(false);
  const [skillsNotes, setSkillsNotes] = useState('');
  const [submittingVolunteer, setSubmittingVolunteer] = useState(false);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eventService.getEventById(id);
      if (res?.success) {
        setEvent(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load event details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  // Action 1: Register as Attendee
  const handleRegisterAttendee = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setSubmittingAttendee(true);
    try {
      const res = await attendeeService.registerAsAttendee(id);
      if (res?.success) {
        showToast(res.message || 'Seat reserved successfully!', 'success');
        fetchEvent();
      }
    } catch (err) {
      showToast(err.message || 'Failed to register as attendee', 'error');
    } finally {
      setSubmittingAttendee(false);
    }
  };

  // Action 1b: Cancel Attendee Seat
  const handleCancelAttendee = async () => {
    setSubmittingAttendee(true);
    try {
      const res = await attendeeService.cancelAttendeeRegistration(id);
      if (res?.success) {
        showToast('Attendee registration cancelled and seat released.', 'info');
        setCancelAttendeeModalOpen(false);
        fetchEvent();
      }
    } catch (err) {
      showToast(err.message || 'Failed to cancel attendee seat', 'error');
    } finally {
      setSubmittingAttendee(false);
    }
  };

  // Action 2: Apply as Volunteer
  const handleApplyVolunteer = async (e) => {
    e.preventDefault();
    setSubmittingVolunteer(true);
    try {
      const res = await registrationService.registerForEvent(id, {
        skills_notes: skillsNotes.trim(),
      });
      if (res?.success) {
        showToast(res.message || 'Volunteer application submitted!', 'success');
        setApplyVolunteerModalOpen(false);
        setSkillsNotes('');
        fetchEvent();
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit volunteer application', 'error');
    } finally {
      setSubmittingVolunteer(false);
    }
  };

  // Action 2b: Cancel Volunteer Application
  const handleCancelVolunteer = async () => {
    if (!event?.user_volunteer_registration?.id) return;
    setSubmittingVolunteer(true);
    try {
      const res = await registrationService.cancelRegistration(event.user_volunteer_registration.id);
      if (res?.success) {
        showToast('Volunteer application withdrawn.', 'info');
        setCancelVolunteerModalOpen(false);
        fetchEvent();
      }
    } catch (err) {
      showToast(err.message || 'Failed to withdraw application', 'error');
    } finally {
      setSubmittingVolunteer(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading event details..." />;
  }

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-full inline-block mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Event Not Found</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          The requested event could not be found or has been removed.
        </p>
        <Link
          to="/events"
          className="px-6 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-xl"
        >
          Return to Events
        </Link>
      </div>
    );
  }

  const {
    title,
    description,
    category_name,
    event_date,
    start_time,
    end_time,
    venue,
    max_attendees = 100,
    registered_attendees_count = 0,
    attendee_spots_remaining = 0,
    is_attendee_full,
    max_volunteers = 10,
    approved_volunteers_count = 0,
    volunteer_spots_remaining = 0,
    is_volunteer_full,
    registration_deadline,
    banner_image,
    requirements,
    status,
    organizer_name,
    organizer_email,
    organizer_department,
    user_attendee_status,
    is_user_registered_attendee,
    user_volunteer_status,
    user_volunteer_registration,
    is_deadline_passed
  } = event;

  const formattedEventDate = new Date(event_date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedDeadline = new Date(registration_deadline).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const isAssignedOrganizer = user?.id === event.organizer_id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to directory</span>
        </button>
      </div>

      {/* Banner / Cover */}
      <div className="relative h-64 sm:h-80 lg:h-96 w-full rounded-3xl overflow-hidden shadow-md bg-slate-900">
        {banner_image ? (
          <img
            src={banner_image}
            alt={title}
            className="w-full h-full object-cover opacity-85"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-transparent flex flex-col justify-end p-6 sm:p-10 text-white">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {category_name && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30">
                {category_name}
              </span>
            )}
            <Badge status={status} size="lg" />
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Main Grid: Details + Two Distinct Action Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Description & Requirements */}
        <div className="lg:col-span-2 space-y-8">
          {/* Organizer / Admin Quick Control Bar */}
          {(isAssignedOrganizer || isAdmin) && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-xs font-bold text-indigo-950">
                    {isAdmin ? 'Administrator Oversight' : 'You are the Assigned Organizer for this event'}
                  </p>
                  <p className="text-[11px] text-indigo-700">
                    Manage attendees and volunteer applications.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/organizer/events/${id}/attendees`}
                  className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl border border-indigo-200 shadow-xs"
                >
                  View Attendees ({registered_attendees_count})
                </Link>
                <Link
                  to={`/organizer/events/${id}/volunteers`}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Manage Volunteers ({approved_volunteers_count}/{max_volunteers})
                </Link>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Event Description & Overview
            </h2>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {description}
            </div>
          </div>

          {/* Volunteer Requirements */}
          {requirements && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Volunteer Roles & Duties
              </h2>
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {requirements}
              </div>
            </div>
          )}

          {/* Organizer Info Box */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
              Assigned Faculty / Club Organizer
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 font-extrabold flex items-center justify-center text-lg">
                {organizer_name?.charAt(0) || 'O'}
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-900">{organizer_name}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  {organizer_department && (
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {organizer_department}
                    </span>
                  )}
                  {organizer_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {organizer_email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Schedule & Separate Registration Action Blocks */}
        <div className="space-y-6">
          {/* Key Event Details Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Date & Location
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Date</span>
                  <span className="font-bold text-slate-800 text-sm">{formattedEventDate}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Time</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {start_time.slice(0, 5)} - {end_time.slice(0, 5)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Venue</span>
                  <span className="font-bold text-slate-800 text-sm">{venue}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Registration Deadline</span>
                  <span className={`font-bold text-xs ${is_deadline_passed ? 'text-rose-600' : 'text-slate-800'}`}>
                    {formattedDeadline} {is_deadline_passed && '(Closed)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BLOCK 1: ATTENDEE REGISTRATION */}
          <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  1. Event Attendee
                </h3>
              </div>
              <span className="text-xs font-bold text-indigo-600">General Seat</span>
            </div>

            {/* Attendee Seat Progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 font-medium">Reserved Seats</span>
                <span className="font-bold text-slate-800">
                  {registered_attendees_count} / {max_attendees}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all ${
                    is_attendee_full ? 'bg-rose-500' : 'bg-indigo-600'
                  }`}
                  style={{
                    width: `${Math.min(100, (registered_attendees_count / max_attendees) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {attendee_spots_remaining > 0
                  ? `⚡ ${attendee_spots_remaining} seat${attendee_spots_remaining > 1 ? 's' : ''} remaining`
                  : '🔴 All attendee seats are fully booked'}
              </p>
            </div>

            {/* Attendee Button / Status */}
            <div>
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center"
                >
                  Log In to Register as Attendee
                </Link>
              ) : isStudent ? (
                is_user_registered_attendee || user_attendee_status === 'registered' ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-center">
                      <p className="text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        You are Registered as Attendee
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">Your seat is confirmed.</p>
                    </div>
                    <button
                      onClick={() => setCancelAttendeeModalOpen(true)}
                      className="w-full py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
                    >
                      Cancel Attendee Seat
                    </button>
                  </div>
                ) : is_deadline_passed ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed"
                  >
                    Registration Closed
                  </button>
                ) : is_attendee_full ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed"
                  >
                    Event Full (No Seats Remaining)
                  </button>
                ) : (
                  <button
                    onClick={handleRegisterAttendee}
                    disabled={submittingAttendee}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>{submittingAttendee ? 'Reserving...' : 'Register as Attendee'}</span>
                  </button>
                )
              ) : (
                <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl text-center text-[11px]">
                  Logged in as {user.role}.
                </div>
              )}
            </div>
          </div>

          {/* ACTION BLOCK 2: VOLUNTEER APPLICATION */}
          <div className="bg-white p-6 rounded-2xl border-2 border-purple-100 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  2. Student Volunteer
                </h3>
              </div>
              <span className="text-xs font-bold text-purple-600">Join Team</span>
            </div>

            {/* Volunteer Quota Progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 font-medium">Approved Volunteers</span>
                <span className="font-bold text-slate-800">
                  {approved_volunteers_count} / {max_volunteers}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all ${
                    is_volunteer_full ? 'bg-rose-500' : 'bg-purple-600'
                  }`}
                  style={{
                    width: `${Math.min(100, (approved_volunteers_count / max_volunteers) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {volunteer_spots_remaining > 0
                  ? `⚡ ${volunteer_spots_remaining} volunteer spot${volunteer_spots_remaining > 1 ? 's' : ''} open`
                  : '🔴 Maximum volunteer quota reached'}
              </p>
            </div>

            {/* Volunteer Button / Status */}
            <div>
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center"
                >
                  Log In to Volunteer
                </Link>
              ) : isStudent ? (
                user_volunteer_status && user_volunteer_status !== 'cancelled' ? (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-xl border text-center ${
                      user_volunteer_status === 'approved'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : user_volunteer_status === 'rejected'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                      <p className="text-xs font-bold capitalize flex items-center justify-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        Volunteer Application: {user_volunteer_status}
                      </p>
                      {user_volunteer_registration?.remarks && (
                        <p className="text-[11px] mt-1 font-medium italic">
                          "{user_volunteer_registration.remarks}"
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setCancelVolunteerModalOpen(true)}
                      className="w-full py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
                    >
                      Withdraw Volunteer Application
                    </button>
                  </div>
                ) : is_deadline_passed ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed"
                  >
                    Volunteer Call Closed
                  </button>
                ) : is_volunteer_full ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed"
                  >
                    Volunteer Quota Full
                  </button>
                ) : (
                  <button
                    onClick={() => setApplyVolunteerModalOpen(true)}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-purple-200 flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>Apply as Volunteer</span>
                  </button>
                )
              ) : (
                <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl text-center text-[11px]">
                  Logged in as {user.role}.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Volunteer Application Modal */}
      <Modal
        isOpen={applyVolunteerModalOpen}
        onClose={() => setApplyVolunteerModalOpen(false)}
        title={`Apply as Volunteer for ${title}`}
      >
        <form onSubmit={handleApplyVolunteer} className="space-y-4">
          <div className="p-3.5 bg-purple-50 text-purple-900 rounded-xl text-xs leading-relaxed">
            <p className="font-bold mb-1">Volunteer Application Form</p>
            <p>
              Applicant: <strong>{user?.name}</strong> ({user?.department || 'Student'} - Roll: {user?.roll_number || 'N/A'})
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Relevant Skills / Experience / Availability Notes (Optional)
            </label>
            <textarea
              rows={4}
              value={skillsNotes}
              onChange={(e) => setSkillsNotes(e.target.value)}
              placeholder="e.g. Previous hackathon coordination experience, photography, audio handling, first aid..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setApplyVolunteerModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingVolunteer}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-purple-200 disabled:opacity-50 flex items-center gap-2"
            >
              {submittingVolunteer ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Attendee Seat Confirm */}
      <ConfirmModal
        isOpen={cancelAttendeeModalOpen}
        onClose={() => setCancelAttendeeModalOpen(false)}
        onConfirm={handleCancelAttendee}
        title="Cancel Attendee Registration"
        message={`Are you sure you want to cancel your reserved seat for "${title}"? This seat will immediately become available for other students.`}
        confirmText="Release My Seat"
        isDanger={true}
        loading={submittingAttendee}
      />

      {/* Cancel Volunteer Confirm */}
      <ConfirmModal
        isOpen={cancelVolunteerModalOpen}
        onClose={() => setCancelVolunteerModalOpen(false)}
        onConfirm={handleCancelVolunteer}
        title="Withdraw Volunteer Application"
        message={`Are you sure you want to withdraw your volunteer application for "${title}"?`}
        confirmText="Withdraw Application"
        isDanger={true}
        loading={submittingVolunteer}
      />
    </div>
  );
};
