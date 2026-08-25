import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventService } from '../../api/services/eventService';
import { categoryService } from '../../api/services/categoryService';
import { EventCard } from '../../components/common/EventCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Sparkles,
  Calendar,
  Users,
  Award,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  GraduationCap,
  Clock,
  ChevronRight
} from 'lucide-react';

export const HomePage = () => {
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, catsRes] = await Promise.all([
          eventService.getEvents({ limit: 6, upcoming: 'true' }),
          categoryService.getCategories()
        ]);
        if (eventsRes?.success) setFeaturedEvents(eventsRes.data);
        if (catsRes?.success) setCategories(catsRes.data);
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-xs sm:text-sm font-semibold shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Campus Volunteer Management Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Lead, Volunteer & Elevate Every{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Campus Event
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              Connect passionate student volunteers with organizers for hackathons, cultural festivals, tech expos, and sports championships. One seamless hub.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <Link
                to="/events"
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <span>Browse Active Events</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 shadow-sm transition-all flex items-center justify-center"
              >
                Join as Student Volunteer
              </Link>
            </div>

            {/* Quick Metrics Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 border-t border-slate-200/60 max-w-4xl mx-auto">
              <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm">
                <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600">500+</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Student Volunteers</p>
              </div>
              <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm">
                <p className="text-2xl sm:text-3xl font-extrabold text-purple-600">45+</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Events Hosted</p>
              </div>
              <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm">
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">100%</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Verified Clubs</p>
              </div>
              <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm">
                <p className="text-2xl sm:text-3xl font-extrabold text-rose-600">24/7</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Real-Time Sync</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Categories
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              Explore by Event Type
            </h2>
          </div>
          <Link
            to="/events"
            className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-2 sm:mt-0"
          >
            <span>View All Categories</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/events?category=${cat.id}`}
              className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-center flex flex-col items-center justify-center group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                {cat.name}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                {cat.event_count || 0} active events
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Upcoming Events */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Opportunities
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              Upcoming Volunteer Calls
            </h2>
          </div>
          <Link
            to="/events"
            className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-2 sm:mt-0"
          >
            <span>Browse All {featuredEvents.length} Events</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner text="Fetching latest events..." />
        ) : featuredEvents.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500">No upcoming events found at this moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Role Workflows Info Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Tailored Roles
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Built for Students, Organizers & Admins
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Every stakeholder has dedicated dashboards, instant status tracking, and purpose-built management tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Students */}
          <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-5">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                For Students / Volunteers
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Discover thrilling campus activities, submit volunteer applications, track approval in real-time, and manage participation.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  1-Click Event Registration
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  Live Approval Status Updates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  Department & Profile Tracking
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                to="/register"
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                <span>Sign up as Student</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Organizers */}
          <div className="bg-white rounded-2xl p-7 border border-indigo-100 shadow-md ring-2 ring-indigo-500/10 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                For Event Organizers
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Publish events, define volunteer requirements, review applicant profiles, accept/reject registrations, and log attendance.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  Event Creation & Capacity Limits
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  Review & Approve Volunteer Applications
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  Attendance & Performance Marking
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                to="/login"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>Organizer Portal Login</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Admin */}
          <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                For College Administrators
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Complete platform oversight: inspect department metrics, moderate events, manage organizer and student accounts.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  System Statistics & Analytics
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  User & Role Moderation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  Full Audit Log of Applications
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                to="/login"
                className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <span>Admin Login</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-8 sm:p-12 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="max-w-xl space-y-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to volunteer for campus events?
            </h3>
            <p className="text-sm text-indigo-200 leading-relaxed">
              Sign up with your college email and roll number to start applying for upcoming hackathons, sports meets, and fests.
            </p>
          </div>
          <Link
            to="/register"
            className="px-8 py-4 bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-sm rounded-2xl shadow-lg transition-all flex-shrink-0"
          >
            Create Student Account
          </Link>
        </div>
      </section>
    </div>
  );
};
