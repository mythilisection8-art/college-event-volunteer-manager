import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  User,
  PlusCircle,
  Users,
  Shield,
  BarChart3,
  Sparkles,
  FileCheck,
  Building2
} from 'lucide-react';
import { Badge } from './Badge';

export const Sidebar = () => {
  const { user, isStudent, isOrganizer, isAdmin } = useAuth();

  const studentLinks = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Browse Events', path: '/events', icon: Calendar },
    { name: 'My Registrations', path: '/student/registrations', icon: ClipboardList },
    { name: 'Profile & Settings', path: '/student/profile', icon: User },
  ];

  const organizerLinks = [
    { name: 'Overview', path: '/organizer/dashboard', icon: LayoutDashboard },
    { name: 'Manage Events', path: '/organizer/events', icon: Calendar },
    { name: 'Create Event', path: '/organizer/events/create', icon: PlusCircle },
    { name: 'Explore All Events', path: '/events', icon: Sparkles },
    { name: 'Organizer Profile', path: '/student/profile', icon: User },
  ];

  const adminLinks = [
    { name: 'Admin Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Event Directory', path: '/admin/events', icon: Calendar },
    { name: 'All Registrations', path: '/admin/registrations', icon: FileCheck },
    { name: 'System Analytics', path: '/admin/stats', icon: BarChart3 },
    { name: 'Admin Profile', path: '/student/profile', icon: Shield },
  ];

  const links = isAdmin ? adminLinks : isOrganizer ? organizerLinks : studentLinks;

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div>
        {/* User Card in Sidebar */}
        <div className="p-3.5 mb-5 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/30 border border-indigo-400/40 text-white font-bold flex items-center justify-center text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate leading-tight">{user?.name}</p>
              <p className="text-[11px] text-indigo-200 truncate mt-0.5">{user?.department || 'Student'}</p>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-slate-300 font-medium">Role</span>
            <Badge status={user?.role} size="sm" />
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Navigation Menu
          </p>
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* College Info Box */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500">
        <div className="flex items-center gap-2 text-slate-700 font-semibold mb-1">
          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>Campus Volunteer Hub</span>
        </div>
        <p className="text-[10px] text-slate-400">
          College Tech Expo 2026 Edition
        </p>
      </div>
    </aside>
  );
};
