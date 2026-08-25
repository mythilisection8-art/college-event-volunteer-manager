import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, ArrowRight, CheckCircle2, Ticket, Sparkles } from 'lucide-react';
import { Badge } from './Badge';

export const EventCard = ({ event }) => {
  const {
    id,
    title,
    description,
    category_name,
    event_date,
    start_time,
    end_time,
    venue,
    max_attendees = 100,
    registered_attendees_count = 0,
    attendee_spots_remaining,
    is_attendee_full,
    max_volunteers = 10,
    approved_volunteers_count = 0,
    volunteer_spots_remaining,
    is_volunteer_full,
    banner_image,
    status,
    user_attendee_status,
    is_user_registered_attendee,
    user_volunteer_status
  } = event;

  const formattedDate = new Date(event_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const seatsLeft = attendee_spots_remaining !== undefined ? attendee_spots_remaining : Math.max(0, max_attendees - registered_attendees_count);
  const volSpotsLeft = volunteer_spots_remaining !== undefined ? volunteer_spots_remaining : Math.max(0, max_volunteers - approved_volunteers_count);

  const seatFillPercentage = Math.min(100, Math.round((registered_attendees_count / max_attendees) * 100));

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col overflow-hidden">
      {/* Event Banner */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        {banner_image ? (
          <img
            src={banner_image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        
        {/* Fallback Gradient if no image or error */}
        <div
          className={`w-full h-full bg-gradient-to-tr from-indigo-900 via-indigo-700 to-purple-600 flex items-center justify-center p-6 text-white ${
            banner_image ? 'hidden' : 'flex'
          }`}
        >
          <span className="font-bold text-center text-lg leading-snug line-clamp-2">
            {title}
          </span>
        </div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {category_name && (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/90 backdrop-blur-md text-indigo-700 border border-white/40 shadow-sm">
              {category_name}
            </span>
          )}
          <Badge status={status} />
        </div>

        {/* Student-Specific Badges (Attendee & Volunteer) */}
        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
          {(is_user_registered_attendee || user_attendee_status === 'registered') && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-600/90 backdrop-blur-md text-white border border-emerald-400 shadow-md">
              <CheckCircle2 className="w-3 h-3" />
              Attending
            </span>
          )}

          {user_volunteer_status && user_volunteer_status !== 'cancelled' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-600/90 backdrop-blur-md text-white border border-purple-400 shadow-md capitalize">
              <Sparkles className="w-3 h-3" />
              Volunteer: {user_volunteer_status}
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1.5">
            {title}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
            {description}
          </p>

          {/* Details List */}
          <div className="space-y-2 text-xs text-slate-600 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span className="font-medium">{formattedDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span>{start_time.slice(0, 5)} - {end_time.slice(0, 5)}</span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span className="truncate">{venue}</span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Attendee Seats + Volunteer Spots */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          {/* Attendee Seats Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <Ticket className="w-3.5 h-3.5 text-indigo-500" />
                Attendee Seats
              </span>
              <span className="font-bold text-slate-700">
                {registered_attendees_count} / {max_attendees}{' '}
                <span className="text-slate-400 font-normal">
                  ({seatsLeft} seats left)
                </span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  is_attendee_full ? 'bg-rose-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${seatFillPercentage}%` }}
              />
            </div>
          </div>

          {/* Volunteer Spots Counter */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-500" />
              Volunteer Quota:
            </span>
            <span className="font-semibold text-slate-700">
              {approved_volunteers_count} / {max_volunteers} filled ({volSpotsLeft} open)
            </span>
          </div>

          <Link
            to={`/events/${id}`}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group-hover:bg-indigo-600 shadow-sm"
          >
            <span>View Event & Register</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};
