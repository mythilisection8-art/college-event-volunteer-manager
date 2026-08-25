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
  Building
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

  const { users = {}, events = {}, registrations = {}, departmentStats = [], recentRegistrations = [], recentUsers = [] } = stats || {};

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
            to="/admin/users"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Manage Users</span>
          </Link>
          <Link
            to="/admin/events"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Manage Events
          </Link>
        </div>
      </div>

      {/* High-Level Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Student Volunteers"
          value={users.total_students || 0}
          subtitle={`${users.active_users || 0} active accounts`}
          icon={GraduationCap}
          color="sky"
        />
        <StatCard
          title="Event Organizers"
          value={users.total_organizers || 0}
          subtitle="Department heads & faculty"
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Total Campus Events"
          value={events.total_events || 0}
          subtitle={`${events.upcoming_events || 0} upcoming`}
          icon={Calendar}
          color="indigo"
        />
        <StatCard
          title="Total Applications Logged"
          value={registrations.total_registrations || 0}
          subtitle={`${registrations.approved_registrations || 0} approved`}
          icon={ClipboardList}
          color="emerald"
        />
      </div>

      {/* Department Breakdown & Registration Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Department Stats */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              Department-Wise Volunteer Participation
            </h2>
            <Link
              to="/admin/stats"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Full Analytics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {departmentStats.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No department logs recorded yet.</p>
            ) : (
              departmentStats.map((dept, idx) => {
                const maxVol = Math.max(...departmentStats.map((d) => d.volunteer_registrations), 1);
                const percent = Math.round((dept.volunteer_registrations / maxVol) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 truncate max-w-[280px]">
                        {dept.department}
                      </span>
                      <span className="font-bold text-slate-900">
                        {dept.volunteer_registrations} signups
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick System Summary */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Registration Health
          </h2>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-xl text-xs">
              <span className="font-semibold text-emerald-800">Approved Applications</span>
              <span className="font-extrabold text-emerald-700">{registrations.approved_registrations || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50/60 rounded-xl text-xs">
              <span className="font-semibold text-amber-800">Pending Review</span>
              <span className="font-extrabold text-amber-700">{registrations.pending_registrations || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-rose-50/60 rounded-xl text-xs">
              <span className="font-semibold text-rose-800">Rejected Applications</span>
              <span className="font-extrabold text-rose-700">{registrations.rejected_registrations || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50/60 rounded-xl text-xs">
              <span className="font-semibold text-purple-800">Completed Shifts</span>
              <span className="font-extrabold text-purple-700">{registrations.attended_volunteers || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity: Registrations & Users Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Registrations */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Recent Application Stream
            </h3>
            <Link
              to="/admin/registrations"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View All
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentRegistrations.map((reg) => (
              <div key={reg.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-slate-800">{reg.student_name}</p>
                  <p className="text-slate-400 text-[11px]">
                    Applied for <strong>{reg.event_title}</strong>
                  </p>
                </div>
                <Badge status={reg.status} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registered Users */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              New Account Registrations
            </h3>
            <Link
              to="/admin/users"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View Users
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentUsers.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-slate-800">{u.name}</p>
                  <p className="text-slate-400 text-[11px]">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={u.role} size="sm" />
                  <Badge status={u.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
