import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../api/services/adminService';
import { categoryService } from '../../api/services/categoryService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import {
  BarChart3,
  Users,
  Calendar,
  CheckCircle2,
  TrendingUp,
  PieChart,
  Award,
  Building,
  Ticket,
  Clock,
  XCircle,
  Filter,
  X,
  Sparkles,
  Search,
  ChevronRight,
  Flame
} from 'lucide-react';

export const SystemStatsPage = () => {
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch Categories once for filter dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const catRes = await categoryService.getCategories();
        if (catRes?.success) {
          setCategories(catRes.data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Stats with current filters
  const fetchStats = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setFiltering(true);

    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category_id = categoryFilter;
      if (startDate.trim() !== '') params.start_date = startDate.trim();
      if (endDate.trim() !== '') params.end_date = endDate.trim();

      const res = await adminService.getStats(params);
      if (res?.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  }, [statusFilter, categoryFilter, startDate, endDate]);

  useEffect(() => {
    fetchStats(true);
  }, []);

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    fetchStats(false);
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setStartDate('');
    setEndDate('');
    // Trigger fetch with empty params
    adminService.getStats().then((res) => {
      if (res?.success) setStats(res.data);
    });
  };

  const hasActiveFilters =
    statusFilter !== 'all' || categoryFilter !== 'all' || startDate !== '' || endDate !== '';

  if (loading) {
    return <LoadingSpinner text="Generating platform analytics report..." />;
  }

  const {
    users = {},
    events = {},
    attendees = {},
    volunteers = {},
    kpis = {},
    popularEvents = [],
    departmentStats = []
  } = stats || {};

  // Safe KPI Extractions with robust fallbacks
  const seatOccupancyRate = kpis.seatOccupancyRate ?? attendees.seat_occupancy_rate ?? 0;
  const volunteerApprovalRate = kpis.volunteerApprovalRate ?? volunteers.approval_rate ?? 0;
  const volunteerCompletionRate = kpis.volunteerCompletionRate ?? volunteers.completion_rate ?? 0;

  const totalSeats = attendees.total_seats ?? events.total_seat_capacity ?? 0;
  const activeAttendees = attendees.active_attendees ?? 0;
  const totalAttendeeRegs = attendees.total_attendee_registrations ?? 0;

  const totalVolApps = volunteers.total_volunteer_applications ?? 0;
  const approvedVolunteers = volunteers.approved_volunteers ?? 0;
  const pendingVolunteers = volunteers.pending_volunteers ?? 0;
  const rejectedVolunteers = volunteers.rejected_volunteers ?? 0;
  const attendedVolunteers = volunteers.attended_volunteers ?? 0;

  const totalEvents = events.total_events ?? 0;
  const upcomingEvents = events.upcoming_events ?? 0;
  const ongoingEvents = events.ongoing_events ?? 0;
  const completedEvents = events.completed_events ?? 0;
  const cancelledEvents = events.cancelled_events ?? 0;
  const publishedEvents = events.published_events ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Campus System Analytics & KPIs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time event performance, attendee seat occupancy, and volunteer application reports.
          </p>
        </div>

        {filtering && (
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
            Updating analytics...
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Filter Analytics Scope</span>
          </span>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Event Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Date From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Date To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Apply Button */}
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* TOP-LEVEL KEY PERFORMANCE INDICATORS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Seat Occupancy Rate"
          value={`${seatOccupancyRate}%`}
          subtitle={`${activeAttendees} of ${totalSeats} seats booked`}
          icon={Ticket}
          color="indigo"
        />
        <StatCard
          title="Volunteer Approval Rate"
          value={`${volunteerApprovalRate}%`}
          subtitle={`${approvedVolunteers} of ${totalVolApps} applications`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Volunteer Completion Rate"
          value={`${volunteerCompletionRate}%`}
          subtitle={`${attendedVolunteers} of ${approvedVolunteers} attended shifts`}
          icon={Award}
          color="purple"
        />
        <StatCard
          title="Total Events Analyzed"
          value={totalEvents}
          subtitle={`${upcomingEvents} upcoming, ${completedEvents} completed`}
          icon={Calendar}
          color="sky"
        />
      </div>

      {/* SECTION 1: DETAILED METRICS GRID (EVENTS, ATTENDEES, VOLUNTEERS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Event Lifecycle Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Event Lifecycle</span>
            </h2>
            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {totalEvents} Total
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 bg-indigo-50/70 rounded-xl text-xs">
              <span className="font-semibold text-indigo-900">Upcoming Events</span>
              <span className="font-bold text-indigo-700">{upcomingEvents}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 rounded-xl text-xs">
              <span className="font-semibold text-emerald-900">Ongoing Events</span>
              <span className="font-bold text-emerald-700">{ongoingEvents}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
              <span className="font-semibold text-slate-700">Completed Events</span>
              <span className="font-bold text-slate-900">{completedEvents}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-rose-50/70 rounded-xl text-xs">
              <span className="font-semibold text-rose-900">Cancelled Events</span>
              <span className="font-bold text-rose-700">{cancelledEvents}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Attendee Registration & Capacity */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Ticket className="w-4 h-4 text-sky-600" />
              <span>Attendee Bookings</span>
            </h2>
            <span className="text-xs font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
              {activeAttendees} Active
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 bg-sky-50/70 rounded-xl text-xs">
              <span className="font-semibold text-sky-900">Total Seat Capacity</span>
              <span className="font-bold text-sky-700">{totalSeats}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 rounded-xl text-xs">
              <span className="font-semibold text-emerald-900">Active Attendee Seats</span>
              <span className="font-bold text-emerald-700">{activeAttendees}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
              <span className="font-semibold text-slate-700">Available Seats Remaining</span>
              <span className="font-bold text-slate-900">{Math.max(0, totalSeats - activeAttendees)}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-amber-50/70 rounded-xl text-xs">
              <span className="font-semibold text-amber-900">Total Registrations Logged</span>
              <span className="font-bold text-amber-700">{totalAttendeeRegs}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Volunteer Application Pipeline */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span>Volunteer Pipeline</span>
            </h2>
            <span className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              {totalVolApps} Total
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 rounded-xl text-xs">
              <span className="font-semibold text-emerald-900">Approved Volunteers</span>
              <span className="font-bold text-emerald-700">{approvedVolunteers}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-amber-50/70 rounded-xl text-xs">
              <span className="font-semibold text-amber-900">Pending Review</span>
              <span className="font-bold text-amber-700">{pendingVolunteers}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-rose-50/70 rounded-xl text-xs">
              <span className="font-semibold text-rose-900">Rejected Applications</span>
              <span className="font-bold text-rose-700">{rejectedVolunteers}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-purple-50/70 rounded-xl text-xs">
              <span className="font-semibold text-purple-900">Verified Attendance</span>
              <span className="font-bold text-purple-700">{attendedVolunteers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: POPULAR EVENTS RANKING & DEPARTMENT PARTICIPATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Popular Events Ranking Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <span>Most Popular Campus Events</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ranked by confirmed attendee bookings and volunteer engagement.
              </p>
            </div>
          </div>

          {popularEvents.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No events found matching the selected filter criteria.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Event Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Attendee Seats</th>
                    <th className="py-3 px-4">Volunteers</th>
                    <th className="py-3 px-4 text-right">Occupancy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {popularEvents.map((evt, idx) => {
                    const maxAtt = parseInt(evt.max_attendees || 100, 10);
                    const attCount = parseInt(evt.attendee_count || 0, 10);
                    const percent = maxAtt > 0 ? Math.min(100, Math.round((attCount / maxAtt) * 100)) : 0;

                    return (
                      <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-bold text-slate-900 line-clamp-1">{evt.title}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(evt.event_date).toLocaleDateString()} • {evt.organizer_name}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {evt.category_name || 'General'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-indigo-600">
                          {attCount} / {maxAtt}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-purple-600">
                          {evt.approved_volunteers_count || 0} / {evt.max_volunteers || 10}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`inline-block font-black text-xs ${
                            percent >= 90 ? 'text-rose-600' : percent >= 60 ? 'text-emerald-600' : 'text-slate-700'
                          }`}>
                            {percent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Department Volunteer & Attendee Distribution */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span>Department Participation</span>
            </h2>
          </div>

          <div className="space-y-4">
            {departmentStats.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No department logs available.</p>
            ) : (
              departmentStats.map((dept, index) => {
                const totalDept = (dept.attendee_registrations_count || 0) + (dept.volunteer_applications_count || 0);
                const maxTotal = Math.max(
                  ...departmentStats.map((d) => (d.attendee_registrations_count || 0) + (d.volunteer_applications_count || 0)),
                  1
                );
                const percentage = Math.round((totalDept / maxTotal) * 100);

                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                          {index + 1}
                        </span>
                        <span className="truncate max-w-[150px]">{dept.department}</span>
                      </span>
                      <div className="text-right">
                        <span className="font-extrabold text-indigo-600">
                          {dept.attendee_registrations_count || 0} attendees
                        </span>
                        <span className="text-slate-400 text-[10px] block">
                          {dept.volunteer_applications_count || 0} volunteers
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
