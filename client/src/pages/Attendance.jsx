import React, { useEffect, useState } from 'react';
import { attendanceAPI, studentAPI } from '../services/api';

const Attendance = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [records, setRecords] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
    fetchAttendance();
  }, [selectedDate]);

  const fetchStudents = async () => {
    try {
      const { data } = await studentAPI.getAll();
      setStudents(data);
      const initialRecords = {};
      data.forEach((s) => {
        initialRecords[s._id] = 'present';
      });
      setRecords(initialRecords);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const { data } = await attendanceAPI.getAll({ date: selectedDate });
      setAttendance(data);
      const recordMap = {};
      data.forEach((a) => {
        recordMap[a.student._id] = a.status;
      });
      setRecords((prev) => ({ ...prev, ...recordMap }));
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    try {
      const recordsArray = Object.entries(records).map(([studentId, status]) => ({
        student: studentId,
        date: selectedDate,
        status,
      }));
      await attendanceAPI.createBulk({ records: recordsArray });
      alert('Attendance saved successfully');
      fetchAttendance();
    } catch (error) {
      console.error('Failed to save attendance:', error);
      alert('Failed to save attendance');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <div className="flex gap-4 w-full sm:w-auto">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="input-field" />
          <button onClick={handleSubmit} className="btn-primary whitespace-nowrap">Save Attendance</button>
        </div>
      </div>
      {loading ? <div className="text-center py-8">Loading...</div> : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Grade</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{s.studentId}</td>
                  <td className="px-4 py-3 text-sm">{s.firstName} {s.lastName}</td>
                  <td className="px-4 py-3 text-sm">{s.grade}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      {['present', 'absent', 'late', 'excused'].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(s._id, status)}
                          className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                            records[s._id] === status ? getStatusColor(status) : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && <tr><td colSpan="4" className="px-4 py-3 text-center text-gray-500">No students found. Add students first.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Attendance;
