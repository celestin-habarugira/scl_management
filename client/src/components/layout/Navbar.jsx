import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/students', label: 'Students' },
    { path: '/attendance', label: 'Attendance' },
    { path: '/performance', label: 'Performance' },
    { path: '/employees', label: 'Employees' },
    { path: '/chat', label: 'Chat' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-primary-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="text-xl font-bold">EP. Cyumushyika</Link>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path ? 'bg-primary-700' : 'hover:bg-primary-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="hidden md:flex items-center space-x-4">
            {user?.photo ? (
              <img src={`${API_URL}${user.photo}`} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/50" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white border-2 border-white/50">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            )}
            <span className="text-sm">Welcome, {user?.firstName}</span>
            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Logout
            </button>
          </div>
          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden pb-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === item.path ? 'bg-primary-700' : 'hover:bg-primary-600'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 px-3 text-sm">{user?.firstName} {user?.lastName}</div>
            <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-sm text-red-300 hover:text-red-100">
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
