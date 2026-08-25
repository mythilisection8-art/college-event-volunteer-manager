import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { attendeeService } from '../../api/services/attendeeService';
import { registrationService } from '../../api/services/registrationService';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { QRRegistrationPassModal } from '../../components/attendee/QRRegistrationPassModal';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Award,
  Calendar,
  MapPin,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Ticket,
  Users,
  QrCode
} from 'lucide-react';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [attendingEvents, setAttendingEvents] = useState([]);
  const [volunteerApps, setVolunteerApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPass, setSelectedPass] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [attendeeRes, volunteerRes] = await Promise.all([
          attendeeService.getMyAttendingEvents(),
          registrationService.getMyRegistrations()
        ]);

        if (attendeeRes?.success) {
          setAttendingEvents(attendeeRes.data || []);
        }
        if (volunteerRes?.success) {
          setVolunteerApps(volunteerRes.data || []);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const totalAttending = attendingEvents?.length || 0;
  const totalVolunteerApps = volunteerApps?.length || 0;
  const approvedVolunteers = (volunteerApps || []).filter(
    (r) => r.registration_status?.toLowerCase() === 'approved'
  ).length;
  const pendingVolunteers = (volunteerApps || []).filter(
    (r) => r.registration_status?.toLowerCase() === 'pending'
  ).length;


  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Student Event & Volunteer Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hello, {user?.name}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200">
              Department of {user?.department || 'Engineering'} • Roll: {user?.roll_number || 'N/A'}
            </p>
          </div>
          <Link
            to="/events"
            className="px-5 py-3 bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs rounded-xl shadow-md transition-all self-start sm:self-auto flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Explore Campus Events</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Events Attending"
          value={totalAttending}
          subtitle="Reserved seats"
          icon={Ticket}
          color="indigo"
        />
        <StatCard
          title="Volunteer Applications"
          value={totalVolunteerApps}
          subtitle="Total submissions"
          icon={ClipboardList}
          color="purple"
        />
        <StatCard
          title="Approved Shifts"
          value={approvedVolunteers}
          subtitle="Selected for duty"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Pending Applications"
          value={pendingVolunteers}
          subtitle="Under coordinator review"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Two Column Layout: Attending Events vs Volunteer Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column 1: Events I'm Attending */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-indigo-600" />
              Events You're Attending
            </h2>
            <Link
              to="/student/registrations"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading events..." />
          ) : attendingEvents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <p className="text-xs text-slate-500">
                You have not registered for any upcoming event seats yet.
              </p>
              <Link
                to="/events"
                className="inline-block text-xs font-bold text-indigo-600 hover:underline"
              >
                Browse & Reserve a Seat →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attendingEvents.slice(0, 4).map((evt) => (
                <div key={evt.attendee_registration_id} className="py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <Link
                      to={`/events/${evt.event_id}`}
                      className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                    >
                      {evt.event_title}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>📅 {new Date(evt.event_date).toLocaleDateString()}</span>
                      <span>📍 {evt.venue}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setSelectedPass({
                          passType: 'attendee',
                          eventId: evt.event_id,
                          registrationId: evt.attendee_registration_id,
                        })
                      }
                      className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-all flex items-center gap-1 shadow-xs"
                      title="View Attendee QR Pass"
                    >
                      <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Pass</span>
                    </button>
                    <span className="hidden sm:inline-block px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                      Confirmed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Volunteer Applications & Assignments */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Your Volunteer Applications
            </h2>
            <Link
              to="/student/registrations"
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading applications..." />
          ) : volunteerApps.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <p className="text-xs text-slate-500">
                You have not applied for any volunteer roles yet.
              </p>
              <Link
                to="/events"
                className="inline-block text-xs font-bold text-purple-600 hover:underline"
              >
                Join an Event Volunteer Team →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {volunteerApps.slice(0, 4).map((app) => (
                <div key={app.registration_id} className="py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <Link
                      to={`/events/${app.event_id}`}
                      className="text-sm font-bold text-slate-900 hover:text-purple-600 transition-colors"
                    >
                      {app.event_title}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>📅 {new Date(app.event_date).toLocaleDateString()}</span>
                      <span>Organizer: {app.organizer_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.registration_status?.toLowerCase() === 'approved' && (
                      <button
                        onClick={() =>
                          setSelectedPass({
                            passType: 'volunteer',
                            eventId: app.event_id,
                            registrationId: app.registration_id,
                          })
                        }

                        className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-all flex items-center gap-1 shadow-xs"
                        title="View Volunteer QR Pass"
                      >
                        <QrCode className="w-3.5 h-3.5 text-purple-600" />
                        <span>Pass</span>
                      </button>
                    )}
                    <Badge status={app.registration_status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attendee & Volunteer QR Pass Modal */}
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

