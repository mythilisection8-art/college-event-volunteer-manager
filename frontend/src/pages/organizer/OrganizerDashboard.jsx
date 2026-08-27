import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { eventService } from '../../api/services/eventService';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Calendar,
  Users,
  Clock,
  Ticket,
  ArrowRight,
  Sparkles,
  MapPin,
  CheckCircle2,
  ChevronRight,
  QrCode
} from 'lucide-react';

export const OrganizerDashboard = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizerEvents = async () => {
      try {
        const res = await eventService.getOrganizerEvents();
        if (res?.success) {
          setEvents(res.data);
        }
      } catch (err) {
        console.error('Error fetching organizer events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrganizerEvents();
  }, []);

  const totalEvents = events.length;
  const totalApprovedVolunteers = events.reduce((acc, evt) => acc + parseInt(evt.approved_count || 0, 10), 0);
  const totalPendingApplications = events.reduce((acc, evt) => acc + parseInt(evt.pending_count || 0, 10), 0);
  const activeEventsCount = events.filter((evt) => evt.status === 'published' || evt.status === 'ongoing').length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
            Organizer Command Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.name}! 🎯
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200">
            {user?.department || 'Event Organizing Committee'} • Manage volunteers and attendee rosters for your assigned events.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/organizer/scan"
            className="px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <QrCode className="w-4 h-4 text-white" />
            <span>Scan QR Gate Pass</span>
          </Link>
          <Link
            to="/organizer/events"
            className="px-5 py-3 bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>View Assigned Events</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Assigned Events"
          value={totalEvents}
          subtitle="Events under your lead"
          icon={Calendar}
          color="indigo"
        />
        <StatCard
          title="Active Approved Volunteers"
          value={totalApprovedVolunteers}
          subtitle="Mobilized on campus"
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Pending Applications"
          value={totalPendingApplications}
          subtitle="Awaiting review"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Active Live Events"
          value={activeEventsCount}
          subtitle="Ongoing / Published"
          icon={CheckCircle2}
          color="purple"
        />
      </div>

      {/* Organizer's Managed Events */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Your Assigned Events & Operations
          </h2>
          <Link
            to="/organizer/events"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Manage All Events</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading events..." />
        ) : events.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200/80 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              No events currently assigned
            </p>
            <p className="text-xs text-slate-500">
              You will see events listed here once an administrator assigns you as the lead organizer.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.slice(0, 4).map((evt) => (
              <div
                key={evt.id}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700">
                      {evt.category_name || 'Event'}
                    </span>
                    <Badge status={evt.status} />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1 line-clamp-1">
                    {evt.title}
                  </h3>

                  <div className="space-y-1 text-xs text-slate-500 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{new Date(evt.event_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{evt.venue}</span>
                    </div>
                  </div>

                  {/* Metrics Box */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-center">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Attendees</p>
                      <p className="text-sm font-extrabold text-indigo-600">{evt.registered_attendees_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Volunteers</p>
                      <p className="text-sm font-extrabold text-emerald-600">{evt.approved_count} / {evt.max_volunteers}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Pending</p>
                      <p className="text-sm font-extrabold text-amber-600">{evt.pending_count}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/organizer/events/${evt.id}/attendees`}
                    className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Attendees</span>
                  </Link>
                  <Link
                    to={`/organizer/events/${evt.id}/volunteers`}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Volunteers ({evt.pending_count} new)</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
