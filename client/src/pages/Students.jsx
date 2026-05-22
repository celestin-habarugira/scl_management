import React, { useEffect, useState } from 'react';
import { studentAPI } from '../services/api';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ firstName: '', lastName: '', studentId: '', grade: '', section: '', dateOfBirth: '', gender: 'male', parentName: '', parentPhone: '', address: '' });

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try {
      const { data } = await studentAPI.getAll({ search });
      setStudents(data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await studentAPI.update(editingId, formData);
      } else {
        await studentAPI.create(formData);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ firstName: '', lastName: '', studentId: '', grade: '', section: '', dateOfBirth: '', gender: 'male', parentName: '', parentPhone: '', address: '' });
      fetchStudents();
    } catch (error) {
      console.error('Failed to save student:', error);
    }
  };

  const handleEdit = (student) => {
    setEditingId(student._id);
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      studentId: student.studentId,
      grade: student.grade,
      section: student.section || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
      gender: student.gender,
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      address: student.address || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await studentAPI.remove(id);
        fetchStudents();
      } catch (error) {
        console.error('Failed to delete student:', error);
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Students</h1>
        <div className="flex gap-4 w-full sm:w-auto">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students..." className="input-field flex-1 sm:w-64" />
          <button onClick={() => { setEditingId(null); setFormData({ firstName: '', lastName: '', studentId: '', grade: '', section: '', dateOfBirth: '', gender: 'male', parentName: '', parentPhone: '', address: '' }); setShowModal(true); }} className="btn-primary whitespace-nowrap">
            + Add Student
          </button>
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Parent</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{s.studentId}</td>
                  <td className="px-4 py-3 text-sm">{s.firstName} {s.lastName}</td>
                  <td className="px-4 py-3 text-sm">{s.grade} {s.section && `- ${s.section}`}</td>
                  <td className="px-4 py-3 text-sm">{s.parentName}</td>
                  <td className="px-4 py-3 text-sm">
                    <button onClick={() => handleEdit(s)} className="text-primary-600 hover:text-primary-800 mr-3">Edit</button>
                    <button onClick={() => handleDelete(s._id)} className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && <tr><td colSpan="5" className="px-4 py-3 text-center text-gray-500">No students found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit Student' : 'Add Student'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name</label><input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="input-field" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label><input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label><input type="text" value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} className="input-field" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Grade</label><input type="text" value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="input-field" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Section</label><input type="text" value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Gender</label><select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="input-field"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label><input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label><input type="tel" value={formData.parentPhone} onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label><input type="text" value={formData.parentName} onChange={(e) => setFormData({ ...formData, parentName: e.target.value })} className="input-field" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-field" rows="2" /></div>
              <div className="flex gap-4 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Add'} Student</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
