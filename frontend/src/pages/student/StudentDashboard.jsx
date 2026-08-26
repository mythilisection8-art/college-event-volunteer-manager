import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { attendeeService } from '../../api/services/attendeeService';
import { registrationService } from '../../api/services/registrationService';
import { eventService } from '../../api/services/eventService';
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
  QrCode,
  Compass,
  Star,
  Flame,
  Zap
} from 'lucide-react';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [attendingEvents, setAttendingEvents] = useState([]);
  const [volunteerApps, setVolunteerApps] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(true);
  const [selectedPass, setSelectedPass] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setRecLoading(true);
      try {
        const [attendeeRes, volunteerRes, recRes] = await Promise.allSettled([
          attendeeService.getMyAttendingEvents(),
          registrationService.getMyRegistrations(),
          eventService.getRecommendations()
        ]);

        if (attendeeRes.status === 'fulfilled' && attendeeRes.value?.success) {
          setAttendingEvents(attendeeRes.value.data || []);
        }
        if (volunteerRes.status === 'fulfilled' && volunteerRes.value?.success) {
          setVolunteerApps(volunteerRes.value.data || []);
        }
        if (recRes.status === 'fulfilled' && recRes.value?.success) {
          setRecommendations(recRes.value.data || []);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
        setRecLoading(false);
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

      {/* AI RECOMMENDATIONS SECTION: "Recommended Events For You" */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-6 border border-indigo-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-indigo-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 fill-slate-950" />
                <span>AI-Powered Match</span>
              </span>
              <span className="text-xs text-indigo-300 font-medium">Personalized for your activity</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
              <span>Recommended Events For You</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/80 mt-0.5">
              Intelligent suggestions based on your department, previous interests, event popularity, and open seat availability.
            </p>
          </div>

          <Link
            to="/events"
            className="text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            <span>All Events Directory</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Recommendations Content */}
        {recLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner text="Analyzing campus events and calculating personalized matches..." />
          </div>
        ) : recommendations.length === 0 ? (
          <div className="py-10 px-6 text-center bg-white/5 rounded-2xl border border-white/10 space-y-2">
            <Compass className="w-8 h-8 text-indigo-300 mx-auto" />
            <p className="text-sm font-bold text-white">No recommendations available yet</p>
            <p className="text-xs text-indigo-200/70 max-w-md mx-auto">
              You may have already registered for all upcoming open events, or new events will be published soon.
            </p>
            <Link
              to="/events"
              className="inline-block mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-all"
            >
              Browse Campus Events →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
            {recommendations.map((evt) => {
              const formattedDate = new Date(evt.event_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              const matchScore = evt.match_score || 80;

              return (
                <div
                  key={evt.id}
                  className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl border border-white/15 hover:border-indigo-400/50 p-5 transition-all duration-300 flex flex-col justify-between space-y-4 hover:shadow-xl"
                >
                  {/* Top Row: Category Badge + Match Score Badge */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white/10 text-indigo-200 border border-white/10 truncate max-w-[150px]">
                        {evt.category_name || 'General'}
                      </span>
                      <span className={`px-2.5 py-1 text-[11px] font-extrabold rounded-full flex items-center gap-1 shadow-sm ${
                        matchScore >= 85
                          ? 'bg-emerald-500/90 text-white border border-emerald-400/60'
                          : matchScore >= 70
                          ? 'bg-indigo-500/90 text-white border border-indigo-400/60'
                          : 'bg-sky-500/90 text-white border border-sky-400/60'
                      }`}>
                        <Star className="w-3 h-3 fill-current" />
                        <span>{matchScore}% Match</span>
                      </span>
                    </div>

                    {/* Event Title */}
                    <div>
                      <Link
                        to={`/events/${evt.id}`}
                        className="text-base font-extrabold text-white group-hover:text-indigo-300 transition-colors line-clamp-1"
                      >
                        {evt.title}
                      </Link>
                      {evt.primary_reason && (
                        <p className="text-[11px] text-amber-300/90 font-semibold mt-1 flex items-center gap-1">
                          <span>💡</span>
                          <span className="truncate">{evt.primary_reason}</span>
                        </p>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 text-xs text-indigo-200/90 pt-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span>{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Seats & Action */}
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-indigo-200">
                      <span className="flex items-center gap-1 font-medium">
                        <Ticket className="w-3 h-3 text-sky-400" />
                        Seats Available:
                      </span>
                      <span className="font-bold text-white">
                        {evt.seats_remaining} / {evt.max_attendees}
                      </span>
                    </div>

                    <Link
                      to={`/events/${evt.id}`}
                      className="w-full py-2.5 px-4 bg-white text-indigo-950 hover:bg-indigo-50 font-extrabold text-xs rounded-xl shadow transition-all duration-200 flex items-center justify-center gap-1.5 group-hover:shadow-md"
                    >
                      <span>View Event & Register</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-indigo-600" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

