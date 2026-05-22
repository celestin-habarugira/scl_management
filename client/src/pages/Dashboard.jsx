import React, { useEffect, useState } from 'react';
import { studentAPI, attendanceAPI } from '../services/api';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState({ totalStudents: 0, presentToday: 0, absentToday: 0, totalAttendance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [studentsRes, attendanceRes] = await Promise.all([
          studentAPI.getAll(),
          attendanceAPI.getAll({ date: new Date().toISOString().split('T')[0] }),
        ]);
        const today = attendanceRes.data;
        setStats({
          totalStudents: studentsRes.data.length,
          presentToday: today.filter((a) => a.status === 'present').length,
          absentToday: today.filter((a) => a.status === 'absent').length,
          totalAttendance: today.length,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, color: 'bg-blue-500', link: '/students' },
    { title: 'Present Today', value: stats.presentToday, color: 'bg-green-500', link: '/attendance' },
    { title: 'Absent Today', value: stats.absentToday, color: 'bg-red-500', link: '/attendance' },
    { title: 'Attendance Recorded', value: stats.totalAttendance, color: 'bg-purple-500', link: '/attendance' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.link} className="card hover:shadow-lg transition-shadow">
            <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center mb-4`}>
              <span className="text-white text-xl font-bold">{stat.value}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-700">{stat.title}</h3>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/students" className="block btn-primary text-center">Manage Students</Link>
            <Link to="/attendance" className="block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-center">Record Attendance</Link>
            <Link to="/performance" className="block bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-center">View Performance</Link>
            <Link to="/employees" className="block bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-center">Manage Employees</Link>
          </div>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">About EP. Cyumushyika</h2>
          <p className="text-gray-600">A comprehensive school management system designed to streamline daily operations, manage student records, track attendance, and monitor academic performance efficiently.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
