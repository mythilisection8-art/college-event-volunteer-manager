import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { eventService } from '../../api/services/eventService';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Ticket,
  Search,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const ManageEventsPage = () => {
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eventService.getOrganizerEvents();
      if (res?.success) {
        setEvents(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load assigned events', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      evt.title.toLowerCase().includes(search.toLowerCase()) ||
      evt.venue.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || evt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Assigned Campus Events
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Oversee your assigned events, monitor attendee registrations, and manage volunteer applications.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by event title or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Events Table / Card List */}
      {loading ? (
        <LoadingSpinner text="Loading your assigned events..." />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No Assigned Events"
          description="You currently have no events assigned to your organizer account matching these filters."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Event Info</th>
                  <th className="py-3.5 px-6">Date & Venue</th>
                  <th className="py-3.5 px-6">Attendees</th>
                  <th className="py-3.5 px-6">Volunteers</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Event Info */}
                    <td className="py-4 px-6 max-w-xs">
                      <p className="font-bold text-sm text-slate-900 line-clamp-1">{evt.title}</p>
                      <span className="text-[11px] text-indigo-600 font-semibold">{evt.category_name || 'General'}</span>
                    </td>

                    {/* Date & Venue */}
                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-800">{new Date(evt.event_date).toLocaleDateString()}</p>
                      <p className="text-slate-400 text-[11px] truncate max-w-[180px]">{evt.venue}</p>
                    </td>

                    {/* Attendees */}
                    <td className="py-4 px-6">
                      <span className="font-bold text-indigo-600">
                        {evt.registered_attendees_count || 0} / {evt.max_attendees || 100}
                      </span>
                      <span className="text-slate-400 block text-[10px]">registered</span>
                    </td>

                    {/* Volunteers */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600">{evt.approved_count} / {evt.max_volunteers}</span>
                        {evt.pending_count > 0 && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px]">
                            {evt.pending_count} pending
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <Badge status={evt.status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                      <Link
                        to={`/organizer/events/${evt.id}/attendees`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold rounded-xl transition-colors"
                        title="View Registered Attendees"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Attendees</span>
                      </Link>

                      <Link
                        to={`/organizer/events/${evt.id}/volunteers`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors"
                        title="Manage Volunteer Applications"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Volunteers</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
