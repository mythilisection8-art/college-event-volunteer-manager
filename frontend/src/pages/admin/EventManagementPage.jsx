import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { eventService } from '../../api/services/eventService';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Calendar,
  Search,
  Users,
  Trash2,
  Edit,
  ExternalLink,
  PlusCircle
} from 'lucide-react';

export const EventManagementPage = () => {
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Delete modal
  const [selectedEventToDelete, setSelectedEventToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eventService.getEvents({
        page: currentPage,
        limit: 10,
        all_statuses: 'true',
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
      if (res?.success) {
        setEvents(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, showToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchEvents();
  };

  const handleDeleteEvent = async () => {
    if (!selectedEventToDelete) return;
    setDeleting(true);
    try {
      const res = await eventService.deleteEvent(selectedEventToDelete.id);
      if (res?.success) {
        showToast(res.message || 'Event removed successfully', 'info');
        setSelectedEventToDelete(null);
        fetchEvents();
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete event', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Campus Event Directory & Moderation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Admin oversight for all campus hackathons, fests, sports, and seminars.
          </p>
        </div>
        <Link
          to="/organizer/events/create"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Event</span>
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search all events by title, venue, keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Events Table */}
      {loading ? (
        <LoadingSpinner text="Loading events..." />
      ) : events.length === 0 ? (
        <EmptyState
          title="No Events Found"
          description="No events match your search query."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Event & Category</th>
                  <th className="py-3.5 px-6">Organizer</th>
                  <th className="py-3.5 px-6">Date & Venue</th>
                  <th className="py-3.5 px-6">Volunteers</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Event & Category */}
                    <td className="py-4 px-6 max-w-xs">
                      <p className="font-bold text-sm text-slate-900 line-clamp-1">{evt.title}</p>
                      <span className="text-[11px] text-indigo-600 font-semibold">{evt.category_name || 'General'}</span>
                    </td>

                    {/* Organizer */}
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-800">{evt.organizer_name}</p>
                      <p className="text-[11px] text-slate-400">{evt.organizer_department || evt.organizer_email}</p>
                    </td>

                    {/* Date & Venue */}
                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-800">{new Date(evt.event_date).toLocaleDateString()}</p>
                      <p className="text-slate-400 text-[11px] truncate max-w-[160px]">{evt.venue}</p>
                    </td>

                    {/* Volunteers */}
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800">{evt.approved_volunteers_count || 0} / {evt.max_volunteers}</span>
                      <span className="text-slate-400 block text-[10px]">
                        {evt.total_registrations_count || 0} applicants
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <Badge status={evt.status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        to={`/organizer/events/${evt.id}/volunteers`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors"
                        title="View & Moderate Volunteers"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Volunteers</span>
                      </Link>

                      <Link
                        to={`/organizer/events/edit/${evt.id}`}
                        className="inline-flex items-center p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                        title="Edit Event"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => setSelectedEventToDelete(evt)}
                        className="inline-flex items-center p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(selectedEventToDelete)}
        onClose={() => setSelectedEventToDelete(null)}
        onConfirm={handleDeleteEvent}
        title="Admin Delete Event"
        message={`Are you sure you want to permanently delete "${selectedEventToDelete?.title}"? This action will remove all applicant records for this event.`}
        confirmText="Delete Event"
        isDanger={true}
        loading={deleting}
      />
    </div>
  );
};
