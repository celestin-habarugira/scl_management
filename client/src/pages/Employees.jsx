import React, { useEffect, useState } from 'react';
import { employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data } = await employeeAPI.getAll();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (emp) => {
    setEditingId(emp._id);
    setEditData({ firstName: emp.firstName, lastName: emp.lastName, email: emp.email, role: emp.role, department: emp.department, phone: emp.phone });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const saveEdit = async (id) => {
    try {
      await employeeAPI.update(id, editData);
      setMessage({ type: 'success', text: 'Employee updated' });
      setEditingId(null);
      fetchEmployees();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this employee?')) return;
    try {
      await employeeAPI.remove(id);
      setMessage({ type: 'success', text: 'Employee deactivated' });
      fetchEmployees();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to deactivate' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Employees</h1>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {loading ? <div className="text-center py-8">Loading...</div> : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Department</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Hire Date</th>
                {isAdmin && <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((e) => (
                <tr key={e._id} className="hover:bg-gray-50">
                  {editingId === e._id ? (
                    <>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-1">
                          <input name="firstName" value={editData.firstName} onChange={handleEditChange} className="w-20 px-2 py-1 border rounded text-sm" />
                          <input name="lastName" value={editData.lastName} onChange={handleEditChange} className="w-20 px-2 py-1 border rounded text-sm" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <input name="email" value={editData.email} onChange={handleEditChange} className="w-full px-2 py-1 border rounded text-sm" />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <select name="role" value={editData.role} onChange={handleEditChange} className="px-2 py-1 border rounded text-sm">
                          <option value="admin">admin</option>
                          <option value="teacher">teacher</option>
                          <option value="staff">staff</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <input name="department" value={editData.department} onChange={handleEditChange} className="w-full px-2 py-1 border rounded text-sm" />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <input name="phone" value={editData.phone} onChange={handleEditChange} className="w-full px-2 py-1 border rounded text-sm" />
                      </td>
                      <td className="px-4 py-3 text-sm">{new Date(e.hireDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(e._id)} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
                          <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-medium">{e.firstName} {e.lastName}</td>
                      <td className="px-4 py-3 text-sm">{e.email}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          e.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          e.role === 'teacher' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {e.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{e.department || '-'}</td>
                      <td className="px-4 py-3 text-sm">{e.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm">{new Date(e.hireDate).toLocaleDateString()}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(e)} className="text-primary-600 hover:text-primary-800 text-xs font-medium">Edit</button>
                            <button onClick={() => handleDeactivate(e._id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Deactivate</button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
              {employees.length === 0 && <tr><td colSpan={isAdmin ? 7 : 6} className="px-4 py-3 text-center text-gray-500">No employees found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Employees;
