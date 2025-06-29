import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import { MDBListGroup, MDBListGroupItem } from 'mdb-react-ui-kit';
import { getallusersAPI, sendRequestAPI, getAcceptedRequestsAPI } from '../../Service/allapi';
import { toast } from 'react-toastify';
import { FaUserPlus } from 'react-icons/fa';

function Newcontact() {
  const [users, setUsers] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const loggedInUserId = sessionStorage.getItem('userId');
        const authToken = sessionStorage.getItem('token');
        if (!loggedInUserId || !authToken) {
          toast.error('Please log in to view users');
          window.location.href = '/login';
          return;
        }
        setCurrentUserId(loggedInUserId); // Fixed the syntax error
        setToken(authToken);

        const headers = { Authorization: `Bearer ${authToken}` };
        const result = await getallusersAPI(headers);
        if (result.status !== 200) {
          toast.error('Failed to fetch users');
          return;
        }
        const filteredUsers = result.data.filter((user) => user._id !== loggedInUserId);
        setUsers(filteredUsers);

        const connections = await getAcceptedRequestsAPI(headers);
        if (connections.status !== 200) {
          toast.error('Failed to fetch connections');
          return;
        }
        setConnectedUsers(connections.data.map((c) => c._id));
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Error fetching data');
        setUsers([]);
        setConnectedUsers([]);
      }
    };

    fetchData();
  }, []);

  const handleSendRequest = async (receiverId) => {
    try {
      if (!token) {
        toast.error('Authentication token not found. Please log in again.');
        window.location.href = '/login';
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const res = await sendRequestAPI(receiverId, headers);
      if (res.status !== 201) {
        toast.error(res.data.message || 'Failed to send request');
        return;
      }
      toast.success(res.data.message || 'Request sent successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error sending request');
      console.error('Error sending request:', error);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Navbar />
      <MDBListGroup style={{ marginLeft: '50px', width: '1070px', marginTop: '32px' }} light>
        {users.map((user, index) => (
          <MDBListGroupItem
            key={index}
            tag="a"
            action
            noBorders
            color="success"
            className="px-3 rounded-3 mb-2 d-flex align-items-center justify-content-between"
          >
            <div className="d-flex align-items-center">
              <img
                src={user.image || 'https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/Uploads/default.jpg'}
                alt="profile"
                style={{ width: '55px', height: '55px', borderRadius: '50%', marginRight: '12px' }}
                onError={(e) => {
                  e.target.src = 'https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/Uploads/default.jpg';
                }}
              />
              <h3 style={{ fontWeight: 600, marginTop: '10px', marginLeft: '5px' }}>
                {user.name || 'Unnamed'}
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {connectedUsers.includes(user._id) ? (
                <button type="button" className="btn btn-secondary" disabled>
                  Connected
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-success"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSendRequest(user._id)}
                >
                  <FaUserPlus style={{ marginRight: '15px', marginBottom: '3px', fontSize: '18px' }} />
                  Connect
                </button>
              )}
            </div>
          </MDBListGroupItem>
        ))}
      </MDBListGroup>
    </div>
  );
}

export default Newcontact;