import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../api/services/adminService';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Users,
  GraduationCap,
  Calendar,
  ClipboardList,
  Shield,
  UserPlus,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Building,
  Ticket,
  TrendingUp,
  Award,
  Flame,
  PlusCircle
} from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminService.getStats();
        if (res?.success) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Compiling college system analytics..." />;
  }

  const {
    users = {},
    events = {},
    attendees = {},
    volunteers = {},
    kpis = {},
    popularEvents = [],
    departmentStats = [],
    recentVolunteers = [],
    recentAttendees = [],
    recentUsers = []
  } = stats || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
            Campus Administration Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            System Overview & Metrics 🛡️
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            College Event Volunteer Management & Operational Analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/events/create"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Event</span>
          </Link>
          <Link
            to="/admin/users"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            <span>Manage Users</span>
          </Link>
        </div>
      </div>

      {/* High-Level Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Registered Students"
          value={users.total_students || 0}
          subtitle={`${users.active_users || 0} active accounts`}
          icon={GraduationCap}
          color="sky"
        />
        <StatCard
          title="Attendee Registrations"
          value={attendees.total_attendee_registrations || 0}
          subtitle={`${kpis.seatOccupancyRate || 0}% seat occupancy`}
          icon={Ticket}
          color="indigo"
        />
        <StatCard
          title="Volunteer Applications"
          value={volunteers.total_volunteer_applications || 0}
          subtitle={`${volunteers.approved_volunteers || 0} approved (${kpis.volunteerApprovalRate || 0}%)`}
          icon={ClipboardList}
          color="emerald"
        />
        <StatCard
          title="Total Campus Events"
          value={events.total_events || 0}
          subtitle={`${events.upcoming_events || 0} upcoming / live`}
          icon={Calendar}
          color="purple"
        />
      </div>

      {/* Operational Highlights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Popular Events Snapshot */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Most Popular Events</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Top campus events with the highest student engagement.
              </p>
            </div>
            <Link
              to="/admin/stats"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All Reports</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {popularEvents.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No events logged yet.</p>
            ) : (
              popularEvents.slice(0, 4).map((evt) => (
                <div key={evt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900 line-clamp-1">{evt.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(evt.event_date).toLocaleDateString()} • Lead: <strong>{evt.organizer_name}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <span className="px-2.5 py-1 bg-sky-50 text-sky-700 font-bold rounded-xl text-[11px]">
                      {evt.attendee_count || 0} / {evt.max_attendees || 100} Attendees
                    </span>
                    <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold rounded-xl text-[11px]">
                      {evt.approved_volunteers_count || 0} / {evt.max_volunteers || 10} Volunteers
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Volunteer Application Pipeline Health */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Volunteer Health</span>
            </h2>
            <Link
              to="/admin/registrations"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View Roster
            </Link>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between p-3 bg-emerald-50/70 rounded-xl text-xs">
              <span className="font-semibold text-emerald-800">Approved Volunteers</span>
              <span className="font-black text-emerald-700">{volunteers.approved_volunteers || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50/70 rounded-xl text-xs">
              <span className="font-semibold text-amber-800">Pending Review</span>
              <span className="font-black text-amber-700">{volunteers.pending_volunteers || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-rose-50/70 rounded-xl text-xs">
              <span className="font-semibold text-rose-800">Rejected Applications</span>
              <span className="font-black text-rose-700">{volunteers.rejected_volunteers || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50/70 rounded-xl text-xs">
              <span className="font-semibold text-purple-800">Completed Shifts</span>
              <span className="font-black text-purple-700">{volunteers.attended_volunteers || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stream 1: Recent Volunteer Applications */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-600" />
              <span>Volunteer Stream</span>
            </h3>
            <Link
              to="/admin/registrations"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              All
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentVolunteers.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No recent volunteer applications.</p>
            ) : (
              recentVolunteers.map((vol) => (
                <div key={vol.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-bold text-slate-800 line-clamp-1">{vol.student_name}</p>
                    <p className="text-slate-400 text-[10px] truncate max-w-[170px]">
                      {vol.event_title}
                    </p>
                  </div>
                  <Badge status={vol.status} size="sm" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stream 2: Recent Attendee Registrations */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-sky-600" />
              <span>Attendee Bookings</span>
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {recentAttendees.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No attendee registrations recorded yet.</p>
            ) : (
              recentAttendees.map((att) => (
                <div key={att.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-bold text-slate-800 line-clamp-1">{att.student_name}</p>
                    <p className="text-slate-400 text-[10px] truncate max-w-[170px]">
                      {att.event_title}
                    </p>
                  </div>
                  <Badge status={att.status} size="sm" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stream 3: Recent Registered Users */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>New Accounts</span>
            </h3>
            <Link
              to="/admin/users"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              All
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentUsers.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No new users registered.</p>
            ) : (
              recentUsers.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-bold text-slate-800 line-clamp-1">{u.name}</p>
                    <p className="text-slate-400 text-[10px] truncate max-w-[170px]">{u.email}</p>
                  </div>
                  <Badge status={u.role} size="sm" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
