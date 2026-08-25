import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { attendeeService } from '../../api/services/attendeeService';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  ArrowLeft,
  Ticket,
  Search,
  CheckCircle2,
  Mail,
  Phone,
  Building,
  Hash,
  Calendar,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';

export const EventAttendeesPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [eventData, setEventData] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendeeService.getEventAttendees(id);
      if (res?.success) {
        setEventData(res.event);
        setAttendees(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load event attendee roster', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchAttendees();
  }, [fetchAttendees]);

  const filteredAttendees = attendees.filter((att) => {
    const term = search.toLowerCase();
    return (
      (att.student_name && att.student_name.toLowerCase().includes(term)) ||
      (att.student_email && att.student_email.toLowerCase().includes(term)) ||
      (att.student_roll_number && att.student_roll_number.toLowerCase().includes(term)) ||
      (att.student_department && att.student_department.toLowerCase().includes(term))
    );
  });

  const maxCapacity = eventData?.max_attendees || 100;
  const registeredCount = attendees.length;
  const seatsRemaining = Math.max(0, maxCapacity - registeredCount);
  const occupancyPercent = Math.min(100, Math.round((registeredCount / maxCapacity) * 100));

  return (
    <div className="space-y-6">
      {/* Header & Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Event Attendee Roster
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Event: <strong className="text-slate-800">{eventData?.title || 'Loading...'}</strong>
            </p>
          </div>
        </div>

        <Link
          to={`/organizer/events/${id}/volunteers`}
          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Users className="w-4 h-4" />
          <span>Switch to Volunteer Roster</span>
        </Link>
      </div>

      {/* Capacity & Attendance Summary Cards */}
      {eventData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-bold uppercase text-slate-400">Total Registered Attendees</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{registeredCount}</p>
            <span className="text-[10px] text-slate-400">Confirmed seat bookings</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-bold uppercase text-slate-400">Max Seat Capacity</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{maxCapacity}</p>
            <span className="text-[10px] text-slate-400">Total venue allowance</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-bold uppercase text-slate-400">Seats Available</p>
            <p className={`text-2xl font-black mt-1 ${seatsRemaining === 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {seatsRemaining}
            </p>
            <span className="text-[10px] text-slate-400">
              {seatsRemaining === 0 ? 'Event is at full capacity' : 'Open seats remaining'}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400 mb-1">
              <span>Seat Occupancy</span>
              <span className="text-slate-700">{occupancyPercent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  occupancyPercent >= 100 ? 'bg-rose-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1.5">
              {registeredCount} of {maxCapacity} seats filled
            </span>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search attendees by name, email, department, or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Attendees Table */}
      {loading ? (
        <LoadingSpinner text="Loading attendee roster..." />
      ) : filteredAttendees.length === 0 ? (
        <EmptyState
          title="No Registered Attendees"
          description={
            search
              ? 'No registered attendees match your search query.'
              : 'No students have reserved attendee seats for this event yet.'
          }
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">#</th>
                  <th className="py-3.5 px-6">Student Attendee</th>
                  <th className="py-3.5 px-6">Department & Roll</th>
                  <th className="py-3.5 px-6">Registered At</th>
                  <th className="py-3.5 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredAttendees.map((att, index) => (
                  <tr key={att.registration_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Index */}
                    <td className="py-4 px-6 text-slate-400 font-bold">
                      {index + 1}
                    </td>

                    {/* Student Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {att.student_name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{att.student_name}</p>
                          <p className="text-[11px] text-slate-400">{att.student_email}</p>
                          {att.student_phone && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" /> {att.student_phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Department & Roll */}
                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-800">{att.student_department || 'General / Student'}</p>
                      <p className="text-[11px] text-slate-400">Roll: {att.student_roll_number || 'N/A'}</p>
                    </td>

                    {/* Registration Timestamp */}
                    <td className="py-4 px-6 text-slate-500">
                      <p className="font-medium text-slate-800">{new Date(att.registered_at).toLocaleDateString()}</p>
                      <p className="text-[11px] text-slate-400">{new Date(att.registered_at).toLocaleTimeString()}</p>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Seat Confirmed</span>
                      </span>
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
