import { useState, useEffect } from 'react';
import { attendanceApi } from '../services/attendance';
import { Icon } from '../layouts/icons';
import { toast } from 'react-toastify';

export default function CheckInBtn() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await attendanceApi.getTodayStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch attendance status', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setLoading(true);
      const data = await attendanceApi.checkIn();
      setStatus(data);
      toast.success('Check-in successful! Have a great day.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLoading(true);
      const data = await attendanceApi.checkOut();
      setStatus(data);
      toast.success('Check-out successful! Goodbye.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) return <div className="check-in-placeholder" />;

  const isCheckedIn = status?.check_in && !status?.check_out;
  const isCompleted = status?.check_in && status?.check_out;

  return (
    <div className="check-in-container">
      {isCompleted ? (
        <div className="attendance-badge completed">
          <Icon name="check" size={14} />
          <span>Work Done</span>
        </div>
      ) : isCheckedIn ? (
        <button className="btn-check-out" onClick={handleCheckOut} disabled={loading}>
          <Icon name="logout" size={16} />
          <span>Check Out</span>
        </button>
      ) : (
        <button className="btn-check-in" onClick={handleCheckIn} disabled={loading}>
          <Icon name="activity" size={16} />
          <span>Check In</span>
        </button>
      )}

      <style>{`
        .check-in-container {
          display: flex;
          align-items: center;
        }
        .btn-check-in, .btn-check-out {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
        }
        .btn-check-in {
          background: linear-gradient(135deg, var(--primary) 0%, #6366f1 100%);
          color: white;
          box-shadow: 0 4px 15px -4px rgba(99, 102, 241, 0.4);
        }
        .btn-check-in:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -8px rgba(99, 102, 241, 0.6);
        }
        .btn-check-out {
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fee2e2;
        }
        .btn-check-out:hover {
          background: #fee2e2;
          transform: translateY(-2px);
        }
        .attendance-badge.completed {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #f0fdf4;
          color: #16a34a;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid #dcfce7;
        }
      `}</style>
    </div>
  );
}
