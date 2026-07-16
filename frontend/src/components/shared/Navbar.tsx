import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">🎓</span>
        <span className="navbar-title">ProctorAI</span>
      </div>
      <div className="navbar-right">
        {user && (
          <>
            <div className="navbar-user">
              <div className="avatar">{user.name[0].toUpperCase()}</div>
              <div>
                <div className="navbar-user-name">{user.name}</div>
                <div className="navbar-user-role">{user.role === 'admin' ? '👑 Admin' : '🎓 Student'}</div>
              </div>
            </div>
            <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
