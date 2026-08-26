import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../api/services/adminService';
import { categoryService } from '../../api/services/categoryService';
import { eventService } from '../../api/services/eventService';
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
  Flame,
  FolderKanban,
  Activity,
  Layers,
  AlertCircle,
  ArrowUpRight,
  Percent,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Info,
  CalendarDays
} from 'lucide-react';

export const SystemStatsPage = () => {
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [eventOptions, setEventOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch Categories & Events once for filter dropdowns
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const [catRes, evRes] = await Promise.all([
          categoryService.getCategories(),
          eventService.getEvents({ all_statuses: 'true', limit: 100 })
        ]);

        if (catRes?.success) {
          setCategories(catRes.data || []);
        }
        if (evRes?.success) {
          setEventOptions(evRes.data || []);
        }
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };
    fetchDropdownOptions();
  }, []);

  // Fetch Stats with current filters
  const fetchStats = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setFiltering(true);

    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category_id = categoryFilter;
      if (eventFilter !== 'all') params.event_id = eventFilter;
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
  }, [statusFilter, categoryFilter, eventFilter, startDate, endDate]);

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
    setEventFilter('all');
    setStartDate('');
    setEndDate('');
    adminService.getStats().then((res) => {
      if (res?.success) setStats(res.data);
    });
  };

  const hasActiveFilters =
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    eventFilter !== 'all' ||
    startDate !== '' ||
    endDate !== '';

  if (loading) {
    return <LoadingSpinner text="Compiling comprehensive campus analytics..." />;
  }

  const {
    events = {},
    attendees = {},
    volunteers = {},
    kpis = {},
    popularEvents = [],
    categoryStats = [],
    departmentStats = [],
    registrationTrends = []
  } = stats || {};

  // Safe Metric Extractions
  const totalEvents = events.total_events || 0;
  const upcomingEvents = events.upcoming_events || 0;
  const ongoingEvents = events.ongoing_events || 0;
  const completedEvents = events.completed_events || 0;
  const cancelledEvents = events.cancelled_events || 0;
  const draftEvents = events.draft_events || 0;
  const publishedEvents = events.published_events || 0;

  const totalSeats = attendees.total_seats ?? events.total_seat_capacity ?? 0;
  const activeAttendees = attendees.active_attendees || 0;
  const cancelledAttendees = attendees.cancelled_attendees || 0;
  const totalAttendeeRegs = attendees.total_attendee_registrations || 0;
  const availableSeats = attendees.seats_remaining ?? Math.max(0, totalSeats - activeAttendees);
  const seatOccupancyRate = kpis.seatOccupancyRate ?? attendees.seat_occupancy_rate ?? 0;

  const totalVolApps = volunteers.total_volunteer_applications || 0;
  const approvedVolunteers = volunteers.approved_volunteers || 0;
  const pendingVolunteers = volunteers.pending_volunteers || 0;
  const rejectedVolunteers = volunteers.rejected_volunteers || 0;
  const cancelledVolunteers = volunteers.cancelled_volunteers || 0;
  const attendedVolunteers = volunteers.attended_volunteers || 0;
  const volunteerApprovalRate = kpis.volunteerApprovalRate ?? volunteers.approval_rate ?? 0;
  const volunteerCompletionRate = kpis.volunteerCompletionRate ?? volunteers.completion_rate ?? 0;

  // Trend Max calculation for responsive SVG scaling
  const maxTrendValue = Math.max(
    ...registrationTrends.map((t) => Math.max(t.attendee_registrations || 0, t.volunteer_applications || 0)),
    5
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-extrabold uppercase tracking-wide">
              Admin Reporting Hub
            </span>
            <span className="text-xs text-slate-400 font-medium">Real Database Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Advanced Analytics & Operations Report 📊
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Comprehensive lifecycle metrics, capacity occupancy, volunteer approvals, and departmental engagement.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchStats(false)}
            disabled={filtering}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${filtering ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{filtering ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 1. FILTER TOOLBAR */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Filter Analytics Scope</span>
          </span>

          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors px-2.5 py-1 bg-rose-50 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Event Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Event Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Specific Event
            </label>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Events</option>
              {eventOptions.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Apply Button */}
          <div className="sm:col-span-2 lg:col-span-5 flex justify-end gap-2 pt-1">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Apply Filters</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. TOP-LEVEL KEY PERFORMANCE INDICATORS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Seat Occupancy Rate"
          value={`${seatOccupancyRate}%`}
          subtitle={`${activeAttendees} booked of ${totalSeats} max seats`}
          icon={Ticket}
          color="indigo"
        />
        <StatCard
          title="Volunteer Approval Rate"
          value={`${volunteerApprovalRate}%`}
          subtitle={`${approvedVolunteers} approved of ${totalVolApps} applicants`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Volunteer Completion Rate"
          value={`${volunteerCompletionRate}%`}
          subtitle={`${attendedVolunteers} verified of ${approvedVolunteers} approved`}
          icon={Award}
          color="purple"
        />
        <StatCard
          title="Events In Scope"
          value={totalEvents}
          subtitle={`${upcomingEvents} upcoming, ${ongoingEvents} ongoing, ${completedEvents} completed`}
          icon={Calendar}
          color="sky"
        />
      </div>

      {/* 3. CORE DOMAIN METRICS BREAKDOWN (EVENT, ATTENDEE, VOLUNTEER) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Section 1: Event Lifecycle Analytics */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>1. Event Analytics</span>
              </h2>
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                {totalEvents} Total
              </span>
            </div>

            <div className="space-y-2.5 mt-4">
              <div className="flex items-center justify-between p-2.5 bg-indigo-50/70 rounded-xl text-xs">
                <span className="font-semibold text-indigo-950">Upcoming Events</span>
                <span className="font-bold text-indigo-700">{upcomingEvents}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 rounded-xl text-xs">
                <span className="font-semibold text-emerald-950">Ongoing Events</span>
                <span className="font-bold text-emerald-700">{ongoingEvents}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                <span className="font-semibold text-slate-700">Completed Events</span>
                <span className="font-bold text-slate-900">{completedEvents}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-rose-50/70 rounded-xl text-xs">
                <span className="font-semibold text-rose-950">Cancelled Events</span>
                <span className="font-bold text-rose-700">{cancelledEvents}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-amber-50/70 rounded-xl text-xs">
                <span className="font-semibold text-amber-950">Draft Events</span>
                <span className="font-bold text-amber-700">{draftEvents}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Volunteer Quota:</span>
            <span className="font-bold text-slate-800">{events.total_volunteer_quota || 0} spots</span>
          </div>
        </div>

        {/* Section 2: Attendee Analytics */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Ticket className="w-4 h-4 text-sky-600" />
                <span>2. Attendee Analytics</span>
              </h2>
              <span className="text-xs font-black text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full">
                {activeAttendees} Active
              </span>
            </div>

            <div className="space-y-2.5 mt-4">
              <div className="flex items-center justify-between p-2.5 bg-sky-50/70 rounded-xl text-xs">
                <span className="font-semibold text-sky-950">Total Seat Capacity</span>
                <span className="font-bold text-sky-700">{totalSeats}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 rounded-xl text-xs">
                <span className="font-semibold text-emerald-950">Occupied Seats (Active)</span>
                <span className="font-bold text-emerald-700">{activeAttendees}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                <span className="font-semibold text-slate-700">Available Seats</span>
                <span className="font-bold text-slate-900">{availableSeats}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-rose-50/70 rounded-xl text-xs">
                <span className="font-semibold text-rose-950">Cancelled Bookings</span>
                <span className="font-bold text-rose-700">{cancelledAttendees}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-indigo-50/70 rounded-xl text-xs">
                <span className="font-semibold text-indigo-950">Total Registrations Logged</span>
                <span className="font-bold text-indigo-700">{totalAttendeeRegs}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Seat Occupancy Rate:</span>
            <span className="font-bold text-indigo-600">{seatOccupancyRate}%</span>
          </div>
        </div>

        {/* Section 3: Volunteer Analytics */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>3. Volunteer Analytics</span>
              </h2>
              <span className="text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
                {totalVolApps} Total
              </span>
            </div>

            <div className="space-y-2.5 mt-4">
              <div className="flex items-center justify-between p-2.5 bg-amber-50/70 rounded-xl text-xs">
                <span className="font-semibold text-amber-950">Pending Review</span>
                <span className="font-bold text-amber-700">{pendingVolunteers}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 rounded-xl text-xs">
                <span className="font-semibold text-emerald-950">Approved Volunteers</span>
                <span className="font-bold text-emerald-700">{approvedVolunteers}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-rose-50/70 rounded-xl text-xs">
                <span className="font-semibold text-rose-950">Rejected Applications</span>
                <span className="font-bold text-rose-700">{rejectedVolunteers}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                <span className="font-semibold text-slate-700">Cancelled by Student</span>
                <span className="font-bold text-slate-900">{cancelledVolunteers}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-purple-50/70 rounded-xl text-xs">
                <span className="font-semibold text-purple-950">Verified Shifts / Completed</span>
                <span className="font-bold text-purple-700">{attendedVolunteers}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Approval / Completion:</span>
            <span className="font-bold text-purple-600">{volunteerApprovalRate}% / {volunteerCompletionRate}%</span>
          </div>
        </div>
      </div>

      {/* 4. REAL REGISTRATION & PARTICIPATION TRENDS TIMELINE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <span>6. Real Participation Trends (Timeline)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Registration volume over time recorded from database timestamps.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-sky-500" />
              <span>Attendee Bookings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-500" />
              <span>Volunteer Applications</span>
            </div>
          </div>
        </div>

        {registrationTrends.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No trend data available for current selection</p>
            <p className="text-xs text-slate-400">
              Try adjusting the date range, event filter, or status filter to see historical registration activity.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visual SVG Chart Bar Grid */}
            <div className="relative pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {registrationTrends.map((point, idx) => {
                  const attCount = point.attendee_registrations || 0;
                  const volCount = point.volunteer_applications || 0;
                  const totalCount = attCount + volCount;
                  const attHeight = maxTrendValue > 0 ? (attCount / maxTrendValue) * 100 : 0;
                  const volHeight = maxTrendValue > 0 ? (volCount / maxTrendValue) * 100 : 0;
                  const isHovered = hoveredTrendIndex === idx;

                  return (
                    <div
                      key={point.reg_date || idx}
                      className="group relative flex flex-col items-center p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer"
                      onMouseEnter={() => setHoveredTrendIndex(idx)}
                      onMouseLeave={() => setHoveredTrendIndex(null)}
                    >
                      {/* Bar Container */}
                      <div className="h-32 w-full flex items-end justify-center gap-1.5 pb-2">
                        {/* Attendee Bar */}
                        <div className="w-3.5 bg-slate-200/80 rounded-t-md relative flex items-end h-full">
                          <div
                            className="w-full bg-gradient-to-t from-sky-600 to-sky-400 rounded-t-md transition-all duration-500"
                            style={{ height: `${Math.max(attHeight, 4)}%` }}
                          />
                        </div>

                        {/* Volunteer Bar */}
                        <div className="w-3.5 bg-slate-200/80 rounded-t-md relative flex items-end h-full">
                          <div
                            className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-md transition-all duration-500"
                            style={{ height: `${Math.max(volHeight, 4)}%` }}
                          />
                        </div>
                      </div>

                      {/* Date label */}
                      <span className="text-[11px] font-bold text-slate-700 mt-1 truncate max-w-full">
                        {point.short_date || point.reg_date}
                      </span>
                      <span className="text-[10px] font-black text-indigo-600">
                        {totalCount} total
                      </span>

                      {/* Tooltip on Hover */}
                      {isHovered && (
                        <div className="absolute -top-16 z-20 bg-slate-900 text-white text-[11px] font-medium py-1.5 px-3 rounded-xl shadow-lg pointer-events-none whitespace-nowrap space-y-0.5">
                          <p className="font-bold text-slate-200">{point.formatted_date || point.reg_date}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sky-300">🎟️ {attCount} Attendees</span>
                            <span className="text-purple-300">🤝 {volCount} Volunteers</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trends Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Total In-Scope Registrations</span>
                <span className="font-black text-slate-900">
                  {registrationTrends.reduce((acc, curr) => acc + (curr.total_registrations || 0), 0)}
                </span>
              </div>
              <div className="p-3.5 bg-sky-50/70 rounded-2xl border border-sky-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-sky-800">Total Attendee Bookings</span>
                <span className="font-black text-sky-700">
                  {registrationTrends.reduce((acc, curr) => acc + (curr.attendee_registrations || 0), 0)}
                </span>
              </div>
              <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-800">Total Volunteer Applications</span>
                <span className="font-black text-purple-700">
                  {registrationTrends.reduce((acc, curr) => acc + (curr.volunteer_applications || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. EVENT PERFORMANCE: POPULAR EVENTS & CATEGORY PARTICIPATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Most Popular Events Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <span>4. Event Performance & Popularity Ranking</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Top campus events ranked by active attendee reservations and volunteer applications.
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
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-4">Event Details</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-4">Attendee Capacity</th>
                    <th className="py-3 px-4">Volunteers</th>
                    <th className="py-3 px-3 text-right">Occupancy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {popularEvents.map((evt, idx) => {
                    const maxAtt = parseInt(evt.max_attendees || 100, 10);
                    const attCount = parseInt(evt.attendee_count || 0, 10);
                    const percent = evt.occupancy_percentage ?? (maxAtt > 0 ? Math.min(100, Math.round((attCount / maxAtt) * 100)) : 0);

                    return (
                      <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-bold text-slate-900 line-clamp-1">{evt.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(evt.event_date).toLocaleDateString()} • Lead: <strong>{evt.organizer_name}</strong>
                          </p>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {evt.category_name || 'General'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className="font-bold text-indigo-600 block">
                              {attCount} / {maxAtt} seats
                            </span>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  percent >= 90 ? 'bg-rose-500' : percent >= 60 ? 'bg-indigo-600' : 'bg-sky-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-purple-600">
                          {evt.approved_volunteers_count || 0} / {evt.max_volunteers || 10}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <span className={`inline-block font-black text-xs px-2 py-0.5 rounded-full ${
                            percent >= 90 ? 'bg-rose-50 text-rose-700' : percent >= 60 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
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

        {/* Top Categories Breakdown */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-indigo-600" />
              <span>Category Participation</span>
            </h2>
          </div>

          <div className="space-y-3.5">
            {categoryStats.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No category data matching current filter.</p>
            ) : (
              categoryStats.map((cat) => {
                const totalCap = parseInt(cat.total_capacity || 0, 10);
                const totalAtt = parseInt(cat.total_attendees || 0, 10);
                const occupancy = totalCap > 0 ? Math.min(100, Math.round((totalAtt / totalCap) * 100)) : 0;

                return (
                  <div key={cat.id} className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-100 space-y-2 transition-all">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 truncate max-w-[170px]">
                        {cat.category_name}
                      </span>
                      <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {cat.event_count || 0} events
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{totalAtt} Attendees</span>
                      <span>{cat.approved_volunteers || 0} Volunteers</span>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full"
                          style={{ width: `${occupancy}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-right font-bold text-slate-400">
                        {occupancy}% capacity filled
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 6. PARTICIPATION: DEPARTMENT PARTICIPATION BREAKDOWN */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600" />
              <span>5. Department-wise Participation Breakdown</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparative student attendee registrations and volunteer applications across college departments.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {departmentStats.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No department activity recorded in scope.</p>
          ) : (
            departmentStats.map((dept, index) => {
              const maxTotal = Math.max(
                ...departmentStats.map((d) => parseInt(d.total_participation || 0, 10)),
                1
              );
              const deptAtt = parseInt(dept.attendee_registrations_count || 0, 10);
              const deptVol = parseInt(dept.volunteer_applications_count || 0, 10);
              const deptTotal = parseInt(dept.total_participation || 0, 10);
              const percent = Math.round((deptTotal / maxTotal) * 100);

              return (
                <div key={index} className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                        {index + 1}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{dept.department}</span>
                        <span className="text-[11px] text-slate-400 block sm:inline sm:ml-2">
                          ({deptTotal} total participation actions)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span className="text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                        🎟️ {deptAtt} Attendees
                      </span>
                      <span className="text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                        🤝 {deptVol} Volunteers ({dept.approved_volunteers_count || 0} approved)
                      </span>
                    </div>
                  </div>

                  {/* Dual Bar */}
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
