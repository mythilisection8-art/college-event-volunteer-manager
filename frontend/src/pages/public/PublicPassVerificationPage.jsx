import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { eventService } from '../../api/services/eventService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Sparkles,
  Search,
  Building,
  Shield,
  ArrowRight,
  UserCheck
} from 'lucide-react';

export const PublicPassVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const routeParams = useParams();

  const queryCode = searchParams.get('code') || '';
  const queryId = searchParams.get('id') || routeParams.id || '';
  const queryType = searchParams.get('type') || routeParams.type || '';

  const [inputCode, setInputCode] = useState(queryCode || queryId || '');
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const verifyPass = useCallback(async (codeToVerify, idToVerify, typeToVerify) => {
    if (!codeToVerify && !idToVerify) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await eventService.publicVerifyAnyPass({
        code: codeToVerify || undefined,
        id: idToVerify || undefined,
        type: typeToVerify || undefined
      });

      if (res?.success && res.data) {
        setPassData(res.data);
      } else {
        setError(res?.message || 'Invalid or non-existent pass code.');
        setPassData(null);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to verify pass. Please verify the pass code and try again.'
      );
      setPassData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (queryCode || queryId) {
      verifyPass(queryCode, queryId, queryType);
    }
  }, [queryCode, queryId, queryType, verifyPass]);

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    verifyPass(inputCode.trim(), undefined, undefined);
  };

  const isVolunteer = passData?.pass_type?.toLowerCase().includes('volunteer');
  const isValid = passData?.is_valid;
  const isCheckedIn = passData?.attendance_status === 'present' || passData?.attendance_status === 'completed';

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-xs">
          <Shield className="w-4 h-4 text-indigo-600" />
          <span>Official Campus Event Pass Portal</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Pass Verification & Authenticity Check
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Public, read-only verification terminal for student event attendance passes and volunteer duty credentials.
        </p>
      </div>

      {/* Manual Search Bar */}
      <form onSubmit={handleManualSearch} className="max-w-xl mx-auto">
        <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
          <div className="pl-3 text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Enter pass code (e.g. REG-ATT-2026-00001 or REG-VOL-...)"
            className="flex-1 bg-transparent border-none text-xs sm:text-sm font-mono text-slate-800 focus:outline-none px-2 py-2"
          />
          <button
            type="submit"
            disabled={loading || !inputCode.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap"
          >
            {loading ? 'Verifying...' : 'Verify Pass'}
          </button>
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="py-12 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <LoadingSpinner text="Querying college event registry & verifying pass authenticity..." />
        </div>
      )}

      {/* Error / Not Found State */}
      {!loading && error && (
        <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-sm text-center max-w-xl mx-auto space-y-4 animate-in fade-in duration-200">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <XCircle className="w-9 h-9" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Pass Verification Failed</h3>
            <p className="text-xs sm:text-sm text-rose-600 font-medium mt-1">{error}</p>
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            This pass could not be validated. It may have been cancelled, expired, or the code was mistyped.
          </p>
        </div>
      )}

      {/* Verified Pass Card */}
      {!loading && passData && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden animate-in fade-in duration-300">
          {/* Card Top Accent Bar */}
          <div
            className={`h-3 w-full ${
              !isValid
                ? 'bg-rose-500'
                : isVolunteer
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700'
                : 'bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-700'
            }`}
          />

          <div className="p-6 sm:p-8 space-y-6">
            {/* Status Banner */}
            <div
              className={`p-4 rounded-2xl flex items-center gap-3.5 border ${
                isValid
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/80 border-rose-200 text-rose-950'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isValid ? 'bg-emerald-600 text-white shadow-xs' : 'bg-rose-600 text-white shadow-xs'
                }`}
              >
                {isValid ? <ShieldCheck className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-extrabold text-sm sm:text-base">
                    {isValid ? 'VERIFIED AUTHENTIC PASS' : 'INVALID / CANCELLED PASS'}
                  </p>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${
                      isValid ? 'bg-emerald-200/80 text-emerald-900' : 'bg-rose-200/80 text-rose-900'
                    }`}
                  >
                    {passData.registration_status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isValid
                    ? `This ${passData.pass_type} is officially registered and active in the campus event registry.`
                    : 'This registration has been cancelled or invalidated.'}
                </p>
              </div>
            </div>

            {/* Pass Metadata Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full ${
                      isVolunteer
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {passData.pass_type}
                  </span>
                  {passData.category_name && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                      {passData.category_name}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {passData.event_title}
                </h2>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Pass Identifier
                </span>
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 inline-block mt-0.5">
                  {passData.pass_code}
                </span>
              </div>
            </div>

            {/* Attendance Status Callout */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <UserCheck className={`w-5 h-5 ${isCheckedIn ? 'text-emerald-600' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-bold text-slate-800">Attendance Check-In Record</p>
                  <p className="text-[11px] text-slate-500">
                    {isCheckedIn
                      ? `Checked in as Present at event`
                      : 'Not yet marked present at entry gate'}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 text-xs font-black rounded-full border ${
                  isCheckedIn
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-slate-200/70 text-slate-700 border-slate-300'
                }`}
              >
                {isCheckedIn ? 'Present / Checked In' : 'Entry Pending'}
              </span>
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Student Holder
                </span>
                <p className="font-bold text-slate-900 text-sm">{passData.student_name}</p>
                <p className="text-[11px] text-slate-400">Verified Campus Participant</p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Event Date & Time
                </span>
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  {passData.event_date ? new Date(passData.event_date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'TBA'}
                </p>
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {passData.start_time?.slice(0, 5)} - {passData.end_time?.slice(0, 5)}
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-xs space-y-1 sm:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Venue Location
                </span>
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{passData.venue}</span>
                </p>
              </div>

              {isVolunteer && passData.organizer_remarks && (
                <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-100 text-xs sm:col-span-2 space-y-0.5">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                    Volunteer Assignment Role
                  </span>
                  <p className="font-semibold text-purple-950">{passData.organizer_remarks}</p>
                </div>
              )}
            </div>

            {/* Read-Only Safety Guarantee Disclaimer */}
            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span>Encrypted College System Verification</span>
              </div>
              <span>Verified at {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="text-center pt-4">
        <Link
          to="/events"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
        >
          <span>Explore Upcoming College Events</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
