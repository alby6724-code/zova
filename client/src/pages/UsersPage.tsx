import React, { useState, useEffect } from 'react';
import { User, UserRole, UserStatus } from '../types/index.js';
import { api } from '../services/api.js';
import { Search, UserPlus, Download, ShieldCheck, ShieldAlert, Ban, CheckCircle } from 'lucide-react';
import { AddUserModal } from '../components/admin/Modals.js';
import { useAuth } from '../context/AuthContext.js';

export const UsersPage: React.FC = () => {
  const { role } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canManageUsers = ['SUPER_ADMIN', 'ADMIN'].includes(role);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getUsers({
        search,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setUsers(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, statusFilter, page]);

  const handleCreateUser = async (data: {
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    location?: string;
  }) => {
    try {
      await api.createUser(data);
      fetchUsers();
    } catch (err) {
      alert('Error creating user');
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      await api.updateUser(userId, { status: newStatus });
      fetchUsers();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      await api.updateUser(userId, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', '2FA Enabled', 'Listings', 'Views'];
    const rows = users.map((u) => [
      u.id,
      `"${u.name}"`,
      u.email,
      u.role,
      u.status,
      u.twoFactorEnabled ? 'Yes' : 'No',
      u.listingsCount,
      u.totalViews,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zova_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {totalCount} registered accounts. Manage permissions, status, and 2FA credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {canManageUsers && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add New User</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, or role..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="MODERATOR">Moderator</option>
            <option value="SUPPORT">Support</option>
            <option value="SELLER">Seller</option>
            <option value="BUYER">Buyer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BANNED">Banned</option>
          </select>
        </div>
      </div>

      {/* Users container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Desktop Table View (≥768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">2FA</th>
                <th className="py-3.5 px-4">Listings</th>
                <th className="py-3.5 px-4">Views</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 flex items-center gap-3">
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <p className="font-bold text-slate-800">{u.name}</p>
                      <p className="text-[11px] text-slate-400">{u.email}</p>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {canManageUsers ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                        className="px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="SUPER_ADMIN">Super Admin</option>
                        <option value="ADMIN">Admin</option>
                        <option value="MODERATOR">Moderator</option>
                        <option value="SUPPORT">Support</option>
                        <option value="SELLER">Seller</option>
                        <option value="BUYER">Buyer</option>
                      </select>
                    ) : (
                      <span className="font-semibold text-slate-700">{u.role}</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (u as any).isLocked
                            ? 'bg-red-100 text-red-800 animate-pulse border border-red-300'
                            : u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : u.status === 'SUSPENDED'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {(u as any).isLocked ? `LOCKED (L${(u as any).lockLevel || 1})` : u.status}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {u.twoFactorEnabled ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" /> Enforced
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                        <ShieldAlert className="w-3.5 h-3.5" /> None
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-700">{u.listingsCount}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{u.totalViews.toLocaleString()}</td>

                  <td className="py-3 px-4 text-right">
                    {canManageUsers && (
                      <div className="flex items-center justify-end gap-1.5">
                        {(u as any).isLocked && (
                          <button
                            onClick={async () => {
                              try {
                                await api.unlockUser(u.id);
                                alert(`Account unlocked for ${u.name}`);
                                fetchUsers();
                              } catch (err: any) {
                                alert(err.message || 'Failed to unlock');
                              }
                            }}
                            className="px-2 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm"
                            title="Admin Override: Unlock Account"
                          >
                            Unlock
                          </button>
                        )}
                        {u.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleUpdateStatus(u.id, 'BANNED')}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Ban User"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(u.id, 'ACTIVE')}
                            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded"
                            title="Activate User"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View (<768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u.id} className="p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 truncate">{u.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    u.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700'
                      : u.status === 'SUSPENDED'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {u.status}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-medium">Role: </span>
                  <span className="font-bold text-slate-800">{u.role}</span>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <span>{u.listingsCount} ads • {u.totalViews.toLocaleString()} views</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  {u.twoFactorEnabled ? (
                    <span className="flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> 2FA Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                      <ShieldAlert className="w-3.5 h-3.5" /> No 2FA
                    </span>
                  )}
                </div>

                {canManageUsers && (
                  <div className="flex items-center gap-2">
                    {u.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleUpdateStatus(u.id, 'BANNED')}
                        className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors"
                      >
                        Ban User
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(u.id, 'ACTIVE')}
                        className="px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {page} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateUser}
      />
    </div>
  );
};
