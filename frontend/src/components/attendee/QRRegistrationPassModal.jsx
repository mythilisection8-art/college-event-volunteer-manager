import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { attendeeService } from '../../api/services/attendeeService';
import { registrationService } from '../../api/services/registrationService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Printer,
  Copy,
  Check,
  Ticket,
  Users,
  Sparkles,
  Hourglass,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';

export const QRRegistrationPassModal = ({
  isOpen,
  onClose,
  passType = 'attendee', // 'attendee' | 'volunteer'
  eventId,
  registrationId,
  initialPassData = null
}) => {
  const [passData, setPassData] = useState(initialPassData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const isVolunteer = passType === 'volunteer' || passData?.pass_type === 'volunteer';

  const fetchPass = useCallback(async () => {
    if (!isOpen) return;
    if (initialPassData) {
      setPassData(initialPassData);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let res;
      if (isVolunteer) {
        if (registrationId) {
          res = await registrationService.getVolunteerPassById(registrationId);
        } else if (eventId) {
          res = await registrationService.getVolunteerPass(eventId);
        }
      } else {
        if (registrationId) {
          res = await attendeeService.getAttendeePassById(registrationId);
        } else if (eventId) {
          res = await attendeeService.getAttendeePass(eventId);
        }
      }

      if (res?.success && res.data) {
        setPassData(res.data);
      } else {
        setError(res?.message || 'Unable to retrieve pass.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load QR pass.');
    } finally {
      setLoading(false);
    }
  }, [isOpen, passType, isVolunteer, eventId, registrationId, initialPassData]);

  useEffect(() => {
    if (isOpen) {
      fetchPass();
    } else {
      setPassData(null);
      setError(null);
      setCopied(false);
    }
  }, [isOpen, fetchPass]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const regStatus = passData?.registration_status;
  const isCancelled = regStatus === 'cancelled';
  const isRejected = regStatus === 'rejected';
  const isPending = regStatus === 'pending';
  const isApprovedVolunteer = isVolunteer && regStatus === 'approved';
  const isRegisteredAttendee = !isVolunteer && regStatus === 'registered';
  const isActive = passData?.is_active;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all z-10 print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 print:hidden">
          <div className="flex items-center gap-2">
            {isVolunteer ? (
              <Sparkles className="w-5 h-5 text-purple-600" />
            ) : (
              <Ticket className="w-5 h-5 text-indigo-600" />
            )}
            <h3 className="text-base font-extrabold text-slate-800">
              {isVolunteer ? 'Official Volunteer Duty Pass' : 'Official Attendee Entry Pass'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Close Pass"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {loading ? (
            <div className="py-12">
              <LoadingSpinner
                text={`Generating your official ${isVolunteer ? 'Volunteer' : 'Attendee'} QR Pass...`}
              />
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Pass Unavailable</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{error}</p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          ) : passData ? (
            <div className="space-y-6">
              {/* Status Notice Banners */}
              {isCancelled && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-extrabold text-rose-700">REGISTRATION CANCELLED</p>
                    <p className="text-rose-600 mt-0.5">
                      This {isVolunteer ? 'volunteer application' : 'seat reservation'} was cancelled. This QR code is invalidated and cannot be used.
                    </p>
                  </div>
                </div>
              )}

              {isRejected && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-extrabold text-rose-700">APPLICATION NOT APPROVED</p>
                    <p className="text-rose-600 mt-0.5">
                      This volunteer application was not selected. No active duty pass is issued.
                    </p>
                  </div>
                </div>
              )}

              {isPending && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
                  <Hourglass className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-extrabold text-amber-800">APPLICATION UNDER REVIEW</p>
                    <p className="text-amber-700 mt-0.5">
                      Your volunteer application is awaiting coordinator approval. The official duty QR pass will activate once approved.
                    </p>
                  </div>
                </div>
              )}

              {/* Ticket Card Container */}
              <div
                className={`relative rounded-3xl border ${
                  isCancelled || isRejected
                    ? 'border-rose-300 bg-rose-50/30'
                    : isPending
                    ? 'border-amber-200 bg-amber-50/20'
                    : isVolunteer
                    ? 'border-purple-200 bg-gradient-to-b from-purple-50/50 via-white to-slate-50/50'
                    : 'border-indigo-200 bg-gradient-to-b from-indigo-50/50 via-white to-slate-50/50'
                } shadow-sm overflow-hidden`}
              >
                {/* Decorative Top Bar */}
                <div
                  className={`h-3 w-full ${
                    isCancelled || isRejected
                      ? 'bg-rose-500'
                      : isPending
                      ? 'bg-amber-500'
                      : isVolunteer
                      ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700'
                      : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600'
                  }`}
                />

                <div className="p-6 space-y-5">
                  {/* Header Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full ${
                            isVolunteer
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {isVolunteer ? 'Volunteer Pass' : 'Attendee Pass'}
                        </span>
                        {passData.event?.category_name && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                            {passData.event.category_name}
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                        {passData.event?.title}
                      </h2>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isCancelled ? (
                        <span className="px-3 py-1 bg-rose-100 text-rose-800 font-extrabold text-xs rounded-full border border-rose-300 flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> Cancelled
                        </span>
                      ) : isRejected ? (
                        <span className="px-3 py-1 bg-rose-100 text-rose-800 font-extrabold text-xs rounded-full border border-rose-300 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Rejected
                        </span>
                      ) : isPending ? (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 font-extrabold text-xs rounded-full border border-amber-300 flex items-center gap-1">
                          <Hourglass className="w-3.5 h-3.5" /> Pending
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full border border-emerald-300 flex items-center gap-1 shadow-xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isVolunteer ? 'Approved Volunteer' : 'Active Pass'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* QR Code Section */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs relative">
                    {/* Overlay for invalid/pending states */}
                    {(isCancelled || isRejected) && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] rounded-2xl flex flex-col items-center justify-center z-10">
                        <span className="px-4 py-1.5 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transform -rotate-6">
                          Void / Inactive
                        </span>
                      </div>
                    )}

                    {isPending && (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] rounded-2xl flex flex-col items-center justify-center z-10 text-center p-4">
                        <Hourglass className="w-8 h-8 text-amber-600 mb-2 animate-bounce" />
                        <span className="px-3.5 py-1 bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md">
                          Awaiting Approval
                        </span>
                        <p className="text-[11px] text-slate-500 mt-2 max-w-xs">
                          Pass activates once organizer approves your application.
                        </p>
                      </div>
                    )}

                    <div className="p-2 bg-white rounded-xl shadow-inner border border-slate-100">
                      <QRCodeSVG
                        value={passData.qr_payload || passData.pass_code || 'PENDING_APPROVAL'}
                        size={170}
                        level="H"
                        includeMargin={true}
                        className={!isActive ? 'opacity-20 grayscale' : 'opacity-100'}
                      />
                    </div>

                    {/* Pass Code & Copy Action */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                        {passData.pass_code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(passData.pass_code)}
                        className={`p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors print:hidden ${
                          isVolunteer ? 'hover:text-purple-600' : 'hover:text-indigo-600'
                        }`}
                        title="Copy Pass Code"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Perforation Divider */}
                  <div className="relative flex items-center justify-between py-1">
                    <div className="absolute -left-8 w-5 h-5 bg-white rounded-full border-r border-slate-200 shadow-inner" />
                    <div className="w-full border-t-2 border-dashed border-slate-200" />
                    <div className="absolute -right-8 w-5 h-5 bg-white rounded-full border-l border-slate-200 shadow-inner" />
                  </div>

                  {/* Volunteer Assigned Role & Attendance Details (Volunteer Pass Only) */}
                  {isVolunteer && (
                    <div className="space-y-2">
                      {passData.organizer_remarks && (
                        <div className="p-3 bg-purple-50/80 border border-purple-100 rounded-xl text-xs text-purple-900">
                          <span className="font-bold block text-purple-950 mb-0.5">
                            Assigned Duty / Coordinator Remarks:
                          </span>
                          <p>{passData.organizer_remarks}</p>
                        </div>
                      )}

                      {passData.attendance_status && passData.attendance_status !== 'not_marked' && (
                        <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs text-slate-700">
                          <span className="font-bold">Attendance Record:</span>
                          <span className="capitalize font-bold text-emerald-700">
                            {passData.attendance_status}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Student Details Grid */}
                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {isVolunteer ? 'Volunteer Name' : 'Attendee Name'}
                      </span>
                      <p className="font-bold text-slate-900 text-sm truncate">
                        {passData.student?.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {passData.student?.email}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Department & Roll
                      </span>
                      <p className="font-bold text-slate-900 truncate">
                        {passData.student?.department || 'General Student'}
                      </p>
                      <p
                        className={`text-[11px] font-semibold truncate ${
                          isVolunteer ? 'text-purple-600' : 'text-indigo-600'
                        }`}
                      >
                        Roll: {passData.student?.roll_number || 'N/A'}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Date & Time
                      </span>
                      <p className="font-bold text-slate-800 flex items-center gap-1 truncate">
                        <Calendar
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isVolunteer ? 'text-purple-500' : 'text-indigo-500'
                          }`}
                        />
                        {passData.event?.event_date
                          ? new Date(passData.event.event_date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'TBA'}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        {passData.event?.start_time?.slice(0, 5)} - {passData.event?.end_time?.slice(0, 5)}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Venue
                      </span>
                      <p className="font-bold text-slate-800 flex items-center gap-1 truncate">
                        <MapPin
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isVolunteer ? 'text-purple-500' : 'text-indigo-500'
                          }`}
                        />
                        <span className="truncate">{passData.event?.venue}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Organizer: {passData.event?.organizer_name || 'Campus Faculty'}
                      </p>
                    </div>
                  </div>

                  {/* Registered Timestamp */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {isVolunteer ? 'Applied' : 'Issued'}:{' '}
                      {passData.registered_at ? new Date(passData.registered_at).toLocaleString() : 'N/A'}
                    </span>
                    <span
                      className={`font-medium ${
                        isVolunteer ? 'text-purple-600' : 'text-indigo-600'
                      }`}
                    >
                      {isVolunteer ? 'Verified Volunteer Record' : 'Verified Registration'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 print:hidden">
                {isActive && (
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Pass</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-6 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all ${
                    isVolunteer
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  Done
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
