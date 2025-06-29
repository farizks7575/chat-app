import React, { useEffect, useState } from 'react';
import { MDBTable, MDBTableHead, MDBTableBody } from 'mdb-react-ui-kit';
import { getallusersAPI } from '../../Service/allapi';
import { toast } from 'react-toastify';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllUsers();
  }, []);

  const getAllUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in.');
        toast.error('Please log in to view users');
        window.location.href = '/login';
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const result = await getallusersAPI(headers);
      if (result.status === 200) {
        setUsers(result.data);
      } else {
        setError('Failed to fetch users.');
        toast.error('Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err.response?.data || err.message);
      setError('Failed to fetch users: ' + (err.response?.data?.message || err.message));
      toast.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxHeight: '100%', overflowY: 'auto' }}>
      {error && <p className="text-danger text-center">{error}</p>}
      {loading ? (
        <p className="text-center">Loading...</p>
      ) : (
        <MDBTable align="middle">
          <MDBTableHead className="bg-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th scope="col">No</th>
              <th scope="col">Profile Image</th>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Gender</th>
              <th scope="col">Account Created Date & Time</th>
              <th scope="col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    sessionStorage.clear();
                    window.location.href = '/login';
                  }}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Logout
                </button>
              </th>
            </tr>
          </MDBTableHead>
          <MDBTableBody>
            {users.map((user, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>
                  <img
                    src={user.image || 'https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/Uploads/default.jpg'}
                    alt="profile"
                    style={{ width: '45px', height: '45px' }}
                    className="rounded-circle"
                    onError={(e) => {
                      e.target.src = 'https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/Uploads/default.jpg';
                    }}
                  />
                </td>
                <td>
                  <p className="fw-bold mb-1">{user.name}</p>
                </td>
                <td>
                  <p className="fw-normal mb-1">{user.email}</p>
                </td>
                <td>
                  <p style={{ marginLeft: '9px' }} className="fw-normal mb-1">
                    {user.gender}
                  </p>
                </td>
                <td>
                  <p style={{ marginLeft: '20px' }} className="fw-normal mb-1">
                    {user.dateOfRegister
                      ? new Date(user.dateOfRegister).toLocaleString()
                      : 'N/A'}
                  </p>
                </td>
                <td></td>
              </tr>
            ))}
          </MDBTableBody>
        </MDBTable>
      )}
    </div>
  );
};

export default ManageUsers;