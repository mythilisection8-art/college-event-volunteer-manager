import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventService } from '../../api/services/eventService';
import { categoryService } from '../../api/services/categoryService';
import { adminService } from '../../api/services/adminService';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Ticket,
  FileText,
  Image,
  Layers,
  Save,
  ArrowLeft,
  UserCheck,
  Building
} from 'lucide-react';

export const CreateEditEventPage = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [categories, setCategories] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    organizer_id: '',
    description: '',
    requirements: '',
    event_date: '',
    start_time: '09:00',
    end_time: '17:00',
    venue: '',
    max_attendees: 100,
    max_volunteers: 10,
    registration_deadline: '',
    banner_image: '',
    status: 'published',
  });

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // Fetch categories and active organizers in parallel
        const [catRes, orgRes] = await Promise.all([
          categoryService.getCategories(),
          adminService.getUsers({ role: 'organizer', status: 'active', limit: 100 })
        ]);

        if (catRes?.success) {
          setCategories(catRes.data);
          if (!isEditMode && catRes.data.length > 0) {
            setFormData((prev) => ({ ...prev, category_id: prev.category_id || catRes.data[0].id }));
          }
        }

        if (orgRes?.success) {
          setOrganizers(orgRes.data);
          if (!isEditMode && orgRes.data.length > 0) {
            setFormData((prev) => ({ ...prev, organizer_id: prev.organizer_id || orgRes.data[0].id }));
          }
        }

        // If editing existing event, load details
        if (isEditMode) {
          const eventRes = await eventService.getEventById(id);
          if (eventRes?.success) {
            const evt = eventRes.data;
            const dateStr = evt.event_date ? evt.event_date.split('T')[0] : '';
            const deadlineStr = evt.registration_deadline
              ? new Date(evt.registration_deadline).toISOString().slice(0, 16)
              : '';

            setFormData({
              title: evt.title || '',
              category_id: evt.category_id || '',
              organizer_id: evt.organizer_id || '',
              description: evt.description || '',
              requirements: evt.requirements || '',
              event_date: dateStr,
              start_time: evt.start_time ? evt.start_time.slice(0, 5) : '09:00',
              end_time: evt.end_time ? evt.end_time.slice(0, 5) : '17:00',
              venue: evt.venue || '',
              max_attendees: evt.max_attendees || 100,
              max_volunteers: evt.max_volunteers || 10,
              registration_deadline: deadlineStr,
              banner_image: evt.banner_image || '',
              status: evt.status || 'published',
            });
          }
        }
      } catch (err) {
        showToast(err.message || 'Error loading event form data', 'error');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [id, isEditMode, showToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        organizer_id: parseInt(formData.organizer_id, 10),
        max_attendees: parseInt(formData.max_attendees, 10) || 100,
        max_volunteers: parseInt(formData.max_volunteers, 10) || 10,
      };

      if (!payload.organizer_id) {
        showToast('Please assign an active organizer to this event.', 'error');
        setSubmitting(false);
        return;
      }

      if (isEditMode) {
        const res = await eventService.updateEvent(id, payload);
        if (res?.success) {
          showToast(res.message || 'Event updated successfully!', 'success');
          navigate('/admin/events');
        }
      } else {
        const res = await eventService.createEvent(payload);
        if (res?.success) {
          showToast(res.message || 'Event created successfully!', 'success');
          navigate('/admin/events');
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to save event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading event configuration..." />;
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/events"
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isEditMode ? 'Edit Campus Event' : 'Create New Campus Event'}
            </h1>
            <p className="text-xs text-slate-500">
              {isEditMode
                ? 'Update event metadata, schedule, faculty organizer assignment, and attendee/volunteer capacities.'
                : 'Admin Event Creation: Configure event details, assign organizer, and publish to campus directory.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: General Info & Organizer Assignment */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>1. General Event Details & Assigned Organizer</span>
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Event Title *
              </label>
              <input
                type="text"
                required
                name="title"
                placeholder="e.g. HackNova 2026 - Annual 36-Hour Hackathon"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <select
                  required
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned Organizer *
                </label>
                <select
                  required
                  name="organizer_id"
                  value={formData.organizer_id}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="" disabled>Select Faculty / Organizer</option>
                  {organizers.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.department || org.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Event Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="published">Published (Open)</option>
                  <option value="draft">Draft (Hidden)</option>
                  <option value="ongoing">Ongoing (Happening Now)</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Description & Agenda *
              </label>
              <textarea
                required
                rows={4}
                name="description"
                placeholder="Comprehensive description of the event, agenda, and expectations..."
                value={formData.description}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Volunteer Requirements & Notes (Optional)
              </label>
              <textarea
                rows={3}
                name="requirements"
                placeholder="Specific volunteer roles needed: e.g. Technical lab networking, attendee check-in, guest hospitality..."
                value={formData.requirements}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section 2: Schedule & Venue */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>2. Schedule & Venue Location</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Event Date *
                </label>
                <input
                  type="date"
                  required
                  name="event_date"
                  value={formData.event_date}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Venue Location *
              </label>
              <input
                type="text"
                required
                name="venue"
                placeholder="e.g. Main Auditorium & Computer Science Seminar Hall A"
                value={formData.venue}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section 3: Attendee & Volunteer Capacity Limits */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>3. Attendee Seats & Volunteer Quota</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Ticket className="w-3 h-3 text-indigo-500" />
                  <span>Max Attendee Seats *</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  name="max_attendees"
                  value={formData.max_attendees}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">General student attendee capacity</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Users className="w-3 h-3 text-purple-500" />
                  <span>Max Volunteers *</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  name="max_volunteers"
                  value={formData.max_volunteers}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Dedicated volunteer workforce quota</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registration Deadline *
                </label>
                <input
                  type="datetime-local"
                  required
                  name="registration_deadline"
                  value={formData.registration_deadline}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Cut-off for attendee & volunteer signups</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Image className="w-3 h-3 text-slate-400" />
                <span>Banner Image URL (Optional)</span>
              </label>
              <input
                type="url"
                name="banner_image"
                placeholder="https://images.unsplash.com/photo-..."
                value={formData.banner_image}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              to="/admin/events"
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Saving Event...' : isEditMode ? 'Update Event' : 'Create & Publish Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
