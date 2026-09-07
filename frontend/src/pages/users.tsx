import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  Stethoscope,
  Activity,
  CheckCircle2,
  XCircle,
  Edit,
  Power,
  ShieldAlert,
} from "lucide-react";

interface StaffUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: "doctor" | "technician" | "admin";
  title?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Create User Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<"doctor" | "technician" | "admin">("doctor");
  const [newPassword, setNewPassword] = useState("");
  const [newTitle, setNewTitle] = useState("");

  // Edit User Modal State
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("doctor");
  const [editTitle, setEditTitle] = useState("");

  const { data: users = [], isLoading } = useQuery<StaffUser[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load staff directory");
      return await res.json();
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Creation failed" }));
        throw new Error(err.detail || "Could not create user.");
      }
      return await res.json();
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/system"] });
      toast({
        title: "Staff Account Created",
        description: `Account for ${created.fullName} (${created.role}) has been provisioned.`,
      });
      setIsCreateOpen(false);
      setNewUsername("");
      setNewEmail("");
      setNewFullName("");
      setNewPassword("");
      setNewTitle("");
    },
    onError: (err: any) => {
      toast({
        title: "Creation Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to toggle status" }));
        throw new Error(err.detail || "Action forbidden");
      }
      return await res.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/system"] });
      toast({
        title: "Status Updated",
        description: res.message,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: string; payload: any }) => {
      const res = await fetch(`/api/users/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.payload),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Update failed" }));
        throw new Error(err.detail || "Could not update user.");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Profile Updated", description: "Staff information saved." });
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast({ title: "Update Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newEmail || !newFullName || !newPassword) {
      toast({ title: "Required Fields", description: "Please complete all required fields.", variant: "destructive" });
      return;
    }
    createUserMutation.mutate({
      username: newUsername,
      email: newEmail,
      full_name: newFullName,
      role: newRole,
      password: newPassword,
      title: newTitle || (newRole === "doctor" ? "Radiologist" : newRole.toUpperCase()),
    });
  };

  const handleEditOpen = (u: StaffUser) => {
    setSelectedUser(u);
    setEditFullName(u.fullName);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditTitle(u.title || "");
  };

  const handleEditSave = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      id: selectedUser.id,
      payload: {
        full_name: editFullName,
        email: editEmail,
        role: editRole,
        title: editTitle,
      },
    });
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.title && u.title.toLowerCase().includes(q));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/20 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs">
              Administrator Console
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">{users.length} Registered Accounts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            User & Team Management
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Provision staff member accounts, configure institutional role permissions (Doctor, Technician, Administrator),
            and manage security access.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-md shadow-purple-500/20 h-10 px-4 rounded-xl"
          data-testid="button-add-user"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Filter Row */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff by name, username, email, title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-background/60"
                data-testid="input-search-users"
              />
            </div>
            <div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 text-xs bg-background/60">
                  <SelectValue placeholder="Role Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="doctor">Doctors (Radiologists)</SelectItem>
                  <SelectItem value="technician">Technicians (MRI Ops)</SelectItem>
                  <SelectItem value="admin">Hospital Administrators</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-foreground">Staff Directory</CardTitle>
            <span className="text-xs text-muted-foreground font-mono">{filteredUsers.length} staff members</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading staff accounts...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Users className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">No staff members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border/80">
                  <tr>
                    <th className="py-3 pl-4">Staff Member</th>
                    <th className="py-3">Role</th>
                    <th className="py-3">Title / Specialty</th>
                    <th className="py-3">Username</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Enrolled</th>
                    <th className="py-3 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold flex items-center justify-center text-xs">
                            {u.avatar || u.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{u.fullName}</p>
                            <p className="text-[11px] text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            u.role === "admin"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                              : u.role === "doctor"
                              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }
                        >
                          {u.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{u.title || "Clinical Staff"}</td>
                      <td className="py-3 font-mono text-muted-foreground">@{u.username}</td>
                      <td className="py-3">
                        <Badge
                          className={
                            u.isActive
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]"
                              : "bg-destructive/20 text-destructive border-destructive/30 text-[10px]"
                          }
                        >
                          {u.isActive ? "ACTIVE" : "DEACTIVATED"}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Active"}
                      </td>
                      <td className="py-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditOpen(u)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title="Edit User"
                            data-testid={`button-edit-user-${u.username}`}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleStatusMutation.mutate(u.id)}
                            disabled={toggleStatusMutation.isPending}
                            className={`h-7 w-7 p-0 ${u.isActive ? "text-destructive hover:bg-destructive/10" : "text-emerald-500 hover:bg-emerald-500/10"}`}
                            title={u.isActive ? "Deactivate Account" : "Activate Account"}
                            data-testid={`button-toggle-user-${u.username}`}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-purple-500" />
              Enroll New Staff Member
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provision clinician credentials with role-enforced permissions
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input
                placeholder="e.g. Dr. Marcus Brody"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Username *</Label>
                <Input
                  placeholder="e.g. mbrody"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Role *</Label>
                <Select value={newRole} onValueChange={(val: any) => setNewRole(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">Doctor (Radiologist)</SelectItem>
                    <SelectItem value="technician">MRI Technologist</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Institutional Email *</Label>
              <Input
                type="email"
                placeholder="mbrody@hospital.org"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Title / Clinical Specialty</Label>
              <Input
                placeholder="e.g. Senior Pediatric Neuroradiologist"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Initial Password *</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {createUserMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-md bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Staff Profile</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update credentials and role assignment for @{selectedUser?.username}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Full Name</Label>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email</Label>
              <Input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleEditSave}
              disabled={updateUserMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
