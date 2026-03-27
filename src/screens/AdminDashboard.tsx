import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, approveUser, rejectUser, UserProfile } from '../firebase';
import { ShieldCheck, ShieldX, UserCheck, UserX, Clock, ChevronRight } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(users);
      setPendingUsers(users.filter(u => u.status === 'pending'));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (uid: string) => {
    try {
      await approveUser(uid);
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleReject = async (uid: string) => {
    try {
      await rejectUser(uid);
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-on-surface">Admin Control Center</h1>
          <p className="text-on-surface-variant">Manage user access and community approvals.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold">
          <ShieldCheck size={18} />
          Admin Access
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-widest">Pending</span>
            <Clock size={16} className="text-primary" />
          </div>
          <p className="text-4xl font-bold text-on-surface">{pendingUsers.length}</p>
        </div>
        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-widest">Approved</span>
            <UserCheck size={16} className="text-emerald-500" />
          </div>
          <p className="text-4xl font-bold text-on-surface">{allUsers.filter(u => u.status === 'approved').length}</p>
        </div>
        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-widest">Total Users</span>
            <ShieldCheck size={16} className="text-on-surface" />
          </div>
          <p className="text-4xl font-bold text-on-surface">{allUsers.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <Clock size={20} className="text-primary" />
          Pending Approvals
        </h2>
        
        {pendingUsers.length === 0 ? (
          <div className="bg-surface-container-low p-12 rounded-3xl border border-dashed border-outline-variant/20 text-center space-y-2">
            <p className="text-on-surface-variant font-medium">No pending requests at the moment.</p>
            <p className="text-sm text-outline">New users will appear here when they sign up.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div key={user.uid} className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 flex items-center justify-between hover:border-primary/20 transition-all">
                <div className="flex items-center gap-4">
                  <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                    alt={user.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="font-bold text-on-surface">{user.displayName}</h3>
                    <p className="text-sm text-outline">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReject(user.uid)}
                    className="px-3 py-2 text-error border border-error/20 hover:bg-error/10 rounded-xl transition-all flex items-center gap-2 text-sm font-bold"
                    title="Reject User"
                  >
                    <ShieldX size={16} />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(user.uid)}
                    className="px-4 py-2 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 text-sm"
                  >
                    <UserCheck size={16} />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <UserCheck size={20} className="text-emerald-500" />
          User Directory
        </h2>
        <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high/50">
                <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {allUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-surface-container-high/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                        alt={user.displayName} 
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="text-sm font-bold text-on-surface">{user.displayName}</p>
                        <p className="text-[10px] text-outline">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                      user.status === 'pending' ? 'bg-primary/10 text-primary' :
                      'bg-error/10 text-error'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-on-surface-variant font-medium">{user.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-outline">
                      {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
