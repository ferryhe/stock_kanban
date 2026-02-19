import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, Key, UserCog, CheckCircle, XCircle } from "lucide-react";

interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export default function UserManagementPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["adminUsers", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      if (search) {
        params.append("search", search);
      }
      
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reset password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleResetPassword = (user: User) => {
    const newPassword = prompt(`Enter new password for ${user.displayName || user.email}:\n\nMust be at least 8 characters with uppercase, lowercase, number, and special character.`);
    if (newPassword && newPassword.length >= 8) {
      resetPasswordMutation.mutate({ userId: user.id, newPassword });
    } else if (newPassword) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = (user: User) => {
    if (confirm(`⚠️ WARNING: This action cannot be undone!\n\nAre you sure you want to permanently delete user:\n${user.displayName || user.email} (${user.email})?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleUpdateRole = (user: User) => {
    const newRole = prompt(
      `Change role for: ${user.displayName || user.email}\n\nCurrent role: ${user.role}\n\nEnter new role:\n• user - Basic user access\n• analyst - Data analyst access\n• admin - Admin access\n• superadmin - Full system access`,
      user.role
    );
    if (newRole && ["user", "analyst", "admin", "superadmin"].includes(newRole)) {
      updateRoleMutation.mutate({ userId: user.id, role: newRole });
    } else if (newRole) {
      toast({
        title: "Invalid Role",
        description: "Must be: user, analyst, admin, or superadmin",
        variant: "destructive",
      });
    }
  };

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by email, username, or display name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-slate-600">
            Total: {total} users
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-2">
          {users.map((user: User) => (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {user.displayName || user.username || "No name"}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      user.role === "superadmin" ? "bg-purple-100 text-purple-700" :
                      user.role === "admin" ? "bg-indigo-100 text-indigo-700" :
                      user.role === "analyst" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {user.role}
                    </span>
                    {user.isActive ? (
                      <CheckCircle className="h-4 w-4 text-green-500" title="Active" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" title="Inactive" />
                    )}
                    {user.emailVerified && (
                      <span className="text-xs text-green-600">✓ Verified</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{user.email}</p>
                  <p className="text-xs text-slate-400">
                    Created: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateRole(user)}
                    title="Change Role"
                  >
                    <UserCog className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleStatusMutation.mutate({ 
                      userId: user.id, 
                      isActive: !user.isActive 
                    })}
                    title={user.isActive ? "Deactivate" : "Activate"}
                  >
                    {user.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResetPassword(user)}
                    title="Reset Password"
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteUser(user)}
                    title="Delete User"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="py-2 px-4 text-sm">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
