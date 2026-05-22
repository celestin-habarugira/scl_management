import React, { useEffect, useState } from 'react';
import { performanceAPI, studentAPI } from '../services/api';

const Performance = () => {
  const [students, setStudents] = useState([]);
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ student: '', subject: '', score: '', grade: '', term: '', year: new Date().getFullYear(), comments: '' });

  useEffect(() => {
    fetchStudents();
    fetchPerformances();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data } = await studentAPI.getAll();
      setStudents(data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchPerformances = async () => {
    try {
      const { data } = await performanceAPI.getAll();
      setPerformances(data);
    } catch (error) {
      console.error('Failed to fetch performances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await performanceAPI.update(editingId, formData);
      } else {
        await performanceAPI.create(formData);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ student: '', subject: '', score: '', grade: '', term: '', year: new Date().getFullYear(), comments: '' });
      fetchPerformances();
    } catch (error) {
      console.error('Failed to save performance:', error);
    }
  };

  const handleEdit = (record) => {
    setEditingId(record._id);
    setFormData({
      student: record.student._id,
      subject: record.subject,
      score: record.score,
      grade: record.grade || '',
      term: record.term,
      year: record.year,
      comments: record.comments || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await performanceAPI.remove(id);
        fetchPerformances();
      } catch (error) {
        console.error('Failed to delete record:', error);
      }
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Performance</h1>
        <button onClick={() => { setEditingId(null); setFormData({ student: '', subject: '', score: '', grade: '', term: '', year: new Date().getFullYear(), comments: '' }); setShowModal(true); }} className="btn-primary whitespace-nowrap">
          + Add Record
        </button>
      </div>
      {loading ? <div className="text-center py-8">Loading...</div> : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Subject</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Score</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Grade</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Term</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Year</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {performances.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{p.student?.firstName} {p.student?.lastName}</td>
                  <td className="px-4 py-3 text-sm">{p.subject}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${getScoreColor(p.score)}`}>{p.score}%</td>
                  <td className="px-4 py-3 text-sm">{p.grade || '-'}</td>
                  <td className="px-4 py-3 text-sm">{p.term}</td>
                  <td className="px-4 py-3 text-sm">{p.year}</td>
                  <td className="px-4 py-3 text-sm">
                    <button onClick={() => handleEdit(p)} className="text-primary-600 hover:text-primary-800 mr-3">Edit</button>
                    <button onClick={() => handleDelete(p._id)} className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
              {performances.length === 0 && <tr><td colSpan="7" className="px-4 py-3 text-center text-gray-500">No performance records found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit Record' : 'Add Performance Record'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Student</label><select value={formData.student} onChange={(e) => setFormData({ ...formData, student: e.target.value })} className="input-field" required>{students.map((s) => (<option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>))}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject</label><input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="input-field" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Score (0-100)</label><input type="number" value={formData.score} onChange={(e) => setFormData({ ...formData, score: e.target.value })} className="input-field" min="0" max="100" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Grade</label><input type="text" value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Term</label><input type="text" value={formData.term} onChange={(e) => setFormData({ ...formData, term: e.target.value })} className="input-field" placeholder="e.g. Term 1" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Year</label><input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} className="input-field" required /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Comments</label><textarea value={formData.comments} onChange={(e) => setFormData({ ...formData, comments: e.target.value })} className="input-field" rows="2" /></div>
              <div className="flex gap-4 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Add'} Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Performance;
