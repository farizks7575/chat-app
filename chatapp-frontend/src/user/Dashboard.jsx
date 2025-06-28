import React, { useEffect, useState, useRef } from 'react';
import '../App.css';
import { getAcceptedRequestsAPI, sendmessageAPI, getMessagesAPI, deleteMessageAPI } from '../../Service/allapi';
import { server_url } from '../../Service/server_url';
import Navbar from './Navbar';
import { MDBContainer, MDBRow, MDBCol, MDBCard, MDBCardBody, MDBInputGroup, MDBIcon } from 'mdb-react-ui-kit';
import socket from '../socket';
import EmojiPicker from 'emoji-picker-react';
import { toast } from 'react-toastify';

function Dashboard() {
  const [acceptedUsers, setAcceptedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState({});
  const userId = sessionStorage.getItem('userId');
  const token = sessionStorage.getItem('token');
  const userImage = sessionStorage.getItem('userImage') || 'default.jpg';
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const messageIds = useRef(new Set());

  const fetchAccepted = async () => {
    try {
      if (!token || !userId) {
        toast.error('Please log in to view accepted users');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const res = await getAcceptedRequestsAPI(headers);
      if (res.status !== 200) {
        toast.error('Failed to fetch accepted users');
        return;
      }
      const usersWithLastMessages = await Promise.all(
        (res?.data || []).map(async (user) => {
          const msgRes = await getMessagesAPI(userId, user._id, headers);
          const msgs = msgRes?.data || [];
          return {
            ...user,
            lastMessage: msgs.length ? msgs[msgs.length - 1] : null,
          };
        })
      );
      setAcceptedUsers(usersWithLastMessages);
    } catch (err) {
      console.error('Error fetching accepted users:', err);
      toast.error('Error fetching accepted users');
      setAcceptedUsers([]);
    }
  };

  const fetchMessages = async (receiverId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await getMessagesAPI(userId, receiverId, headers);
      if (res.status !== 200) {
        toast.error('Failed to fetch messages');
        return;
      }
      const fetchedMessages = res?.data || [];
      messageIds.current.clear();
      setMessages(fetchedMessages);
      fetchedMessages.forEach((msg) => messageIds.current.add(msg._id));
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Error fetching messages');
      setMessages([]);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setMessages([]);
    messageIds.current.clear();
    fetchMessages(user._id);
    setIsDropdownOpen({});
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const body = { sender: userId, receiver: selectedUser._id, content: newMessage };
      const res = await sendmessageAPI(body, headers);
      if (res.status !== 201) {
        toast.error('Failed to send message');
        return;
      }
      const sentMessage = res.data;

      if (!messageIds.current.has(sentMessage._id)) {
        setMessages((prev) => [...prev, sentMessage]);
        messageIds.current.add(sentMessage._id);
      }

      setAcceptedUsers((prev) =>
        prev.map((user) =>
          user._id === selectedUser._id
            ? { ...user, lastMessage: sentMessage }
            : user
        )
      );

      socket.emit('send_message', {
        sender: userId,
        receiver: selectedUser._id,
        content: newMessage,
        timestamp: sentMessage.timestamp,
        _id: sentMessage._id,
      });

      setNewMessage('');
      setShowEmojiPicker(false);
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Error sending message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await deleteMessageAPI(messageId, headers);
      if (res.status !== 200) {
        toast.error('Failed to delete message');
        return;
      }
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      messageIds.current.delete(messageId);
      socket.emit('message_deleted', { messageId, receiver: selectedUser._id });
      setIsDropdownOpen((prev) => ({ ...prev, [messageId]: false }));
    } catch (err) {
      console.error('Error deleting message:', err);
      toast.error('Error deleting message');
    }
  };

  const toggleDropdown = (messageId) => {
    setIsDropdownOpen((prev) => ({
      ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
      [messageId]: !prev[messageId],
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!userId || !token) {
      toast.error('Please log in to continue');
      return;
    }

    fetchAccepted();
    socket.emit('register_user', userId);

    const handleRequestAccepted = () => {
      fetchAccepted();
    };

    const handleReceiveMessage = (message) => {
      if (
        message._id &&
        !messageIds.current.has(message._id) &&
        selectedUser &&
        (message.sender === selectedUser._id || message.receiver === selectedUser._id)
      ) {
        setMessages((prev) => [...prev, message]);
        messageIds.current.add(message._id);
      }

      setAcceptedUsers((prev) =>
        prev.map((user) =>
          user._id === message.sender
            ? { ...user, lastMessage: message }
            : user
        )
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      messageIds.current.delete(messageId);
      setIsDropdownOpen((prev) => ({ ...prev, [messageId]: false }));
    };

    socket.on('request_accepted', handleRequestAccepted);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      socket.off('request_accepted', handleRequestAccepted);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [userId, token, selectedUser]);

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Navbar />
      <MDBContainer fluid style={{ flex: 1, padding: 0 }}>
        <MDBRow className="h-100 m-0">
          <MDBCol md="12" className="h-100 p-0">
            <MDBCard className="h-100">
              <MDBCardBody className="h-100 p-0">
                <MDBRow className="h-100 m-0">
                  <MDBCol md="6" lg="5" xl="4" className="p-0">
                    <div className="p-3" style={{ backgroundColor: '#f8f9fb', height: '100%' }}>
                      <MDBInputGroup className="rounded mb-3">
                        <input className="form-control" placeholder="Search" type="search" />
                        <span className="input-group-text border-0">
                          <MDBIcon fas icon="search" />
                        </span>
                      </MDBInputGroup>
                      <div style={{ overflowY: 'auto', height: 'calc(100% - 60px)' }}>
                        {acceptedUsers.length === 0 ? (
                          <p className="text-center mt-5 text-muted">No accepted users</p>
                        ) : (
                          acceptedUsers.map((u) => (
                            <li
                              key={u._id}
                              className={`p-2 border-bottom list-unstyled ${
                                selectedUser?._id === u._id ? 'bg-light' : ''
                              }`}
                              onClick={() => handleUserSelect(u)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="d-flex justify-content-between">
                                <div className="d-flex flex-row">
                                  <img
                                    src={`${server_url}/Uploads/${u.image || 'default.jpg'}`}
                                    onError={(e) => {
                                      e.target.src = `${server_url}/Uploads/default.jpg`;
                                    }}
                                    alt="avatar"
                                    width="60"
                                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                  <div className="pt-1 ps-4">
                                    <p className="fw-bold mb-0">{u.name}</p>
                                    <p className="small text-muted">
                                      {u.lastMessage?.content
                                        ? `${u.lastMessage.content.split(' ').slice(0, 4).join(' ')}...`
                                        : 'You’re now connected'}
                                    </p>
                                  </div>
                                </div>
                                <div className="pt-1">
                                  <p className="small text-muted mb-1">
                                    {u.lastMessage?.timestamp
                                      ? new Date(u.lastMessage.timestamp).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : ''}
                                  </p>
                                  {u.lastMessage && (
                                    <span style={{ marginLeft: '15px' }} className="badge bg-danger rounded-pill">
                                      •
                                    </span>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))
                        )}
                      </div>
                    </div>
                  </MDBCol>
                  <MDBCol md="6" lg="7" xl="8" className="p-0 chat-container">
                    <div className="chat-wrapper">
                      {!selectedUser ? (
                        <div className="empty-chat-state">
                          <img
                            src="/messenger.png"
                            alt="Chat illustration"
                            className="empty-chat-image"
                          />
                          <p className="empty-chat-text">Select a user to start chatting</p>
                        </div>
                      ) : (
                        <div className="messages-container">
                          {messages.map((msg) => (
                            <div
                              key={msg._id}
                              className={`message-bubble ${msg.sender === userId ? 'outgoing' : 'incoming'}`}
                            >
                              {msg.sender !== userId && (
                                <img
                                  src={`${server_url}/Uploads/${selectedUser.image || 'default.jpg'}`}
                                  alt="avatar"
                                  className="message-avatar"
                                  onError={(e) => {
                                    e.target.src = `${server_url}/Uploads/default.jpg`;
                                  }}
                                />
                              )}
                              <div className="message-content-wrapper">
                                <div className={`message-content ${msg.sender === userId ? 'sent' : 'received'}`}>
                                  <div className="message-text">{msg.content}</div>
                                  <div className="message-time">
                                    {new Date(msg.timestamp).toLocaleString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                </div>
                                {msg.sender === userId && (
                                  <div className="message-actions">
                                    <button
                                      className="action-button"
                                      onClick={() => toggleDropdown(msg._id)}
                                    >
                                      <MDBIcon fas icon="ellipsis-v" />
                                    </button>
                                    {isDropdownOpen[msg._id] && (
                                      <div className="action-menu-below">
                                        <button
                                          className="action-item"
                                          onClick={() => handleDeleteMessage(msg._id)}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {msg.sender === userId && (
                                <img
                                  src={`${server_url}/Uploads/${userImage}`}
                                  alt="avatar"
                                  className="message-avatar"
                                  onError={(e) => {
                                    e.target.src = `${server_url}/Uploads/default.jpg`;
                                  }}
                                />
                              )}
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                      {selectedUser && (
                        <div className="text-muted d-flex justify-content-start align-items-center p-3 border-top">
                          <img
                            src={`${server_url}/Uploads/${userImage}`}
                            alt="avatar"
                            style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                            onError={(e) => {
                              e.target.src = `${server_url}/Uploads/default.jpg`;
                            }}
                          />
                          <input
                            type="text"
                            className="form-control form-control-lg mx-3"
                            placeholder="Type message"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          />
                          <div style={{ position: 'relative' }}>
                            <a
                              className="ms-3 text-muted"
                              href="#!"
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                              <MDBIcon fas icon="smile" />
                            </a>
                            {showEmojiPicker && (
                              <div style={{ position: 'absolute', bottom: '100%', right: 0, zIndex: 1000 }}>
                                <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={400} />
                              </div>
                            )}
                          </div>
                          <a className="ms-3" href="#!" onClick={handleSendMessage}>
                            <MDBIcon fas icon="paper-plane" />
                          </a>
                        </div>
                      )}
                    </div>
                  </MDBCol>
                </MDBRow>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
        </MDBRow>
      </MDBContainer>
    </div>
  );
}

export default Dashboard;