import React, { useState, useEffect } from 'react';
import { adminService } from '../../api/services/adminService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatCard } from '../../components/common/StatCard';
import {
  BarChart3,
  Users,
  Calendar,
  CheckCircle2,
  TrendingUp,
  PieChart,
  Award,
  Building
} from 'lucide-react';

export const SystemStatsPage = () => {
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
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Generating platform analytics report..." />;
  }

  const { users = {}, events = {}, registrations = {}, departmentStats = [] } = stats || {};

  const totalRegs = parseInt(registrations.total_registrations || 0, 10);
  const approvedRegs = parseInt(registrations.approved_registrations || 0, 10);
  const approvalRate = totalRegs > 0 ? Math.round((approvedRegs / totalRegs) * 100) : 0;
  const attendedCount = parseInt(registrations.attended_volunteers || 0, 10);
  const completionRate = approvedRegs > 0 ? Math.round((attendedCount / approvedRegs) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Campus System Analytics & KPIs
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Real-time metrics on volunteer mobilization, acceptance ratios, and department engagement.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Overall Approval Rate"
          value={`${approvalRate}%`}
          subtitle={`${approvedRegs} of ${totalRegs} approved`}
          icon={TrendingUp}
          color="indigo"
        />
        <StatCard
          title="Shift Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${attendedCount} verified attendances`}
          icon={Award}
          color="emerald"
        />
        <StatCard
          title="Active Student Base"
          value={users.total_students || 0}
          subtitle="Registered undergraduates"
          icon={Users}
          color="sky"
        />
        <StatCard
          title="Hosted Events"
          value={events.total_events || 0}
          subtitle={`${events.upcoming_events || 0} upcoming`}
          icon={Calendar}
          color="purple"
        />
      </div>

      {/* Analytics Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Department Engagement Table & Progress */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            Department Volunteer Ranking
          </h2>

          <div className="space-y-4">
            {departmentStats.map((dept, index) => {
              const maxCount = Math.max(...departmentStats.map((d) => d.volunteer_registrations), 1);
              const percentage = Math.round((dept.volunteer_registrations / maxCount) * 100);

              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                        {index + 1}
                      </span>
                      {dept.department}
                    </span>
                    <span className="font-extrabold text-indigo-600">
                      {dept.volunteer_registrations} applications
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Application Status Breakdown */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600" />
            Application Funnel & Status Breakdown
          </h2>

          <div className="space-y-4">
            {/* Approved */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-900">Approved Volunteers</p>
                <p className="text-[11px] text-emerald-700">Ready or attended events</p>
              </div>
              <span className="text-2xl font-black text-emerald-600">
                {registrations.approved_registrations || 0}
              </span>
            </div>

            {/* Pending */}
            <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-900">Pending Review</p>
                <p className="text-[11px] text-amber-700">Awaiting organizer response</p>
              </div>
              <span className="text-2xl font-black text-amber-600">
                {registrations.pending_registrations || 0}
              </span>
            </div>

            {/* Rejected */}
            <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-rose-900">Rejected Applications</p>
                <p className="text-[11px] text-rose-700">Capacity exceeded or disqualified</p>
              </div>
              <span className="text-2xl font-black text-rose-600">
                {registrations.rejected_registrations || 0}
              </span>
            </div>

            {/* Cancelled */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Student Cancelled</p>
                <p className="text-[11px] text-slate-500">Withdrawn applications</p>
              </div>
              <span className="text-2xl font-black text-slate-600">
                {registrations.cancelled_registrations || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
