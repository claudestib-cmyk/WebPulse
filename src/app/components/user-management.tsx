import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import {
  Users,
  Shield,
  Edit2,
  Trash2,
  UserPlus,
  Search,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

type UserRole = "viewer" | "admin" | "super_admin";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastActive: string;
}

interface UserManagementProps {
  onBack: () => void;
}

export function UserManagement({ onBack }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("viewer");

  useEffect(() => {
    initializePage();
  }, []);

  async function initializePage() {
    setLoading(true);
    await Promise.all([fetchCurrentUserRole(), fetchUsers()]);
    setLoading(false);
  }

  async function fetchCurrentUserRole() {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    console.log("AUTH USER:", authData?.user);
    console.log("AUTH USER ID:", authData?.user?.id);
    console.log("AUTH USER EMAIL:", authData?.user?.email);

    if (authError) {
      console.error("Failed to get authenticated user:", authError);
      return;
    }

    if (!authData?.user) {
      console.error("No authenticated user found.");
      return;
    }

    setCurrentUserId(authData.user.id);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role")
      .eq("id", authData.user.id)
      .single();

    console.log("PROFILE ROW:", data);
    console.log("PROFILE ERROR:", error);

    if (error) {
      console.error("Failed to fetch current user role:", error);
      return;
    }

    if (data?.role) {
      setCurrentUserRole(data.role as UserRole);
    }
  }

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
      return;
    }

    const mappedUsers: User[] = (data || []).map((item) => ({
      id: item.id,
      name: item.full_name || "No Name",
      email: item.email || "No Email",
      role: (item.role || "viewer") as UserRole,
      lastActive: item.created_at
        ? new Date(item.created_at).toLocaleString()
        : "No activity",
    }));

    setUsers(mappedUsers);
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "admin":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "viewer":
        return "bg-purple-100 text-purple-700 border-purple-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "viewer":
        return "Viewer";
      default:
        return "Unknown";
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const { data: authData } = await supabase.auth.getUser();

    if (authData?.user?.id === userId && newRole !== "super_admin") {
      alert("You cannot change your own role.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role.");
      return;
    }

    setEditingUser(null);
    await fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    const { data: authData } = await supabase.auth.getUser();

    if (authData?.user?.id === userId) {
      alert("You cannot delete your own account.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user.");
      return;
    }

    await fetchUsers();
  };

 const handleAddUser = async () => {
  alert(
    "New users must sign up from the signup page first. After they sign up, you can assign their role here."
  );

  setNewName("");
  setNewEmail("");
  setNewRole("viewer");
  setShowAddUser(false);
};

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = searchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <p className="text-gray-600 text-lg">Loading users...</p>
      </div>
    );
  }

  if (currentUserRole !== "super_admin") {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            Only Super Admins can access User Management.
          </p>
          <Button
            onClick={onBack}
            className="bg-purple-600 text-white hover:bg-purple-700 rounded-xl px-6 py-3"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-3 rounded-xl">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage user roles and permissions</p>
            <p className="text-sm text-gray-500 mt-1">
              Current role: {currentUserRole ?? "unknown"}
            </p>
          </div>
        </div>

        <Button
          onClick={onBack}
          variant="outline"
          className="rounded-xl px-4 py-2 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-3xl p-6 border-2 border-purple-300 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-100 p-2.5 rounded-2xl flex-shrink-0">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Viewer</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Read-only access to dashboards and monitoring data
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border-2 border-blue-300 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-2.5 rounded-2xl flex-shrink-0">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Admin</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Can manage websites, alerts, and reports but not users
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border-2 border-yellow-300 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-yellow-100 p-2.5 rounded-2xl flex-shrink-0">
              <Shield className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 break-words">
              Super Admin
            </h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Full system access including user and role management
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <Button
            onClick={() => setShowAddUser(true)}
            className="bg-purple-600 text-white hover:bg-purple-700 rounded-xl px-6 py-3 flex items-center gap-2"
          >
            <UserPlus className="h-5 w-5" />
            Add User
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  User
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Last Active
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.name}
                          {currentUserId === user.id && (
                            <span className="ml-2 text-xs text-purple-600">(You)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {editingUser?.id === user.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editingUser.role}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                role: e.target.value as UserRole,
                              })
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>

                          <Button
                            onClick={() => handleRoleChange(user.id, editingUser.role)}
                            className="bg-green-600 text-white hover:bg-green-700 rounded-lg px-3 py-2 text-sm"
                          >
                            Save
                          </Button>

                          <Button
                            onClick={() => setEditingUser(null)}
                            variant="outline"
                            className="border-gray-300 rounded-lg px-3 py-2 text-sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {getRoleLabel(user.role)}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">{user.lastActive}</td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {editingUser?.id !== user.id && (
                          <>
                            <Button
                              onClick={() => setEditingUser(user)}
                              variant="ghost"
                              className="hover:bg-gray-100 rounded-lg p-2"
                            >
                              <Edit2 className="h-4 w-4 text-gray-600" />
                            </Button>

                            <Button
                              onClick={() => handleDeleteUser(user.id)}
                              variant="ghost"
                              className="hover:bg-red-50 rounded-lg p-2"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New User</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter user name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                Temporary password will be: <strong>TempPassword123!</strong>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <Button
                onClick={handleAddUser}
                className="flex-1 bg-purple-600 text-white hover:bg-purple-700 rounded-xl py-3"
              >
                Add User
              </Button>

              <Button
                onClick={() => {
                  setShowAddUser(false);
                  setNewName("");
                  setNewEmail("");
                  setNewRole("viewer");
                }}
                variant="outline"
                className="flex-1 border-gray-300 rounded-xl py-3"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}