import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventService } from '../../api/services/eventService';
import { categoryService } from '../../api/services/categoryService';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  Image,
  Layers,
  Save,
  ArrowLeft,
  CheckSquare
} from 'lucide-react';

export const CreateEditEventPage = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    description: '',
    requirements: '',
    event_date: '',
    start_time: '09:00',
    end_time: '17:00',
    venue: '',
    max_volunteers: 10,
    registration_deadline: '',
    banner_image: '',
    status: 'published',
  });

  // Fetch categories and existing event data if editing
  useEffect(() => {
    const initData = async () => {
      try {
        const catRes = await categoryService.getCategories();
        if (catRes?.success) {
          setCategories(catRes.data);
          if (!isEditMode && catRes.data.length > 0) {
            setFormData((prev) => ({ ...prev, category_id: catRes.data[0].id }));
          }
        }

        if (isEditMode) {
          const eventRes = await eventService.getEventById(id);
          if (eventRes?.success) {
            const evt = eventRes.data;
            // Format dates for input fields
            const dateStr = evt.event_date ? evt.event_date.split('T')[0] : '';
            const deadlineStr = evt.registration_deadline
              ? new Date(evt.registration_deadline).toISOString().slice(0, 16)
              : '';

            setFormData({
              title: evt.title || '',
              category_id: evt.category_id || '',
              description: evt.description || '',
              requirements: evt.requirements || '',
              event_date: dateStr,
              start_time: evt.start_time ? evt.start_time.slice(0, 5) : '09:00',
              end_time: evt.end_time ? evt.end_time.slice(0, 5) : '17:00',
              venue: evt.venue || '',
              max_volunteers: evt.max_volunteers || 10,
              registration_deadline: deadlineStr,
              banner_image: evt.banner_image || '',
              status: evt.status || 'published',
            });
          }
        }
      } catch (err) {
        showToast(err.message || 'Error loading event data', 'error');
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
      if (isEditMode) {
        const res = await eventService.updateEvent(id, formData);
        if (res?.success) {
          showToast('Event updated successfully!', 'success');
          navigate('/organizer/events');
        }
      } else {
        const res = await eventService.createEvent(formData);
        if (res?.success) {
          showToast('Event created successfully!', 'success');
          navigate('/organizer/events');
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to save event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading event details..." />;
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/organizer/events"
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isEditMode ? 'Edit Campus Event' : 'Create New Campus Event'}
            </h1>
            <p className="text-xs text-slate-500">
              {isEditMode
                ? 'Update event details, timing, and volunteer capacity.'
                : 'Publish a new opportunity for student volunteers.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: General Info */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-indigo-600">
              1. General Event Details
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  Event Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="published">Published (Open for Registration)</option>
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
                placeholder="Comprehensive description of the event, expectations, and volunteer duties..."
                value={formData.description}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Volunteer Requirements & Prerequisites
              </label>
              <textarea
                rows={3}
                name="requirements"
                placeholder="Specific roles needed: e.g. Lab networking, kit distribution, photography, guest hospitality..."
                value={formData.requirements}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section: Schedule & Location */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-indigo-600">
              2. Schedule & Venue
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
                placeholder="e.g. Main Auditorium & CS Lab 2"
                value={formData.venue}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section: Volunteer Limits & Media */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-indigo-600">
              3. Volunteer Capacity & Media
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Maximum Volunteers Required *
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
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registration Deadline (Date & Time) *
                </label>
                <input
                  type="datetime-local"
                  required
                  name="registration_deadline"
                  value={formData.registration_deadline}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Banner Image URL (Unsplash or direct image link)
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
              to="/organizer/events"
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
              <span>{submitting ? 'Saving Event...' : isEditMode ? 'Update Event' : 'Publish Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
