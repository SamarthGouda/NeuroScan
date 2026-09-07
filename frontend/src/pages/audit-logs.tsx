import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ShieldCheck,
  Search,
  History,
  Lock,
  User,
  Activity,
  FileText,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import type { AuditLogItem } from "@shared/schema";

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const { data, isLoading } = useQuery<{ total: number; logs: AuditLogItem[] }>({
    queryKey: ["/api/audit", searchTerm, actionFilter, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (roleFilter !== "all") params.append("role", roleFilter);
      params.append("limit", "150");

      const res = await fetch(`/api/audit?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load audit logs");
      return await res.json();
    },
  });

  const logs = data?.logs || [];

  const getActionBadge = (action: string) => {
    if (action.includes("FAIL") || action.includes("BLOCK") || action.includes("DEACTIVATE")) {
      return <Badge variant="destructive" className="text-[10px] font-mono">{action}</Badge>;
    }
    if (action.includes("LOGIN") || action.includes("SUCCESS") || action.includes("CREATE")) {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">{action}</Badge>;
    }
    if (action.includes("UPLOAD") || action.includes("ANALYZE") || action.includes("PREDICT")) {
      return <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono">{action}</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] font-mono">{action}</Badge>;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/20 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs">
              Immutable Security Log
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">{data?.total ?? 0} Recorded Events</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            System & Clinical Audit Trail
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Complete, chronological records of all authentication events, MRI scan ingestions,
            inference runs, user management actions, and diagnostic report exports.
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit trail by user, keyword, IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-background/60"
                data-testid="input-search-audit"
              />
            </div>

            <div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-9 text-xs bg-background/60">
                  <SelectValue placeholder="Action Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="LOGIN_SUCCESS">LOGIN_SUCCESS</SelectItem>
                  <SelectItem value="LOGIN_FAILED">LOGIN_FAILED</SelectItem>
                  <SelectItem value="UPLOAD_AND_ANALYZE_SCAN">UPLOAD_AND_ANALYZE_SCAN</SelectItem>
                  <SelectItem value="GENERATE_REPORT">GENERATE_REPORT</SelectItem>
                  <SelectItem value="CREATE_USER">CREATE_USER</SelectItem>
                  <SelectItem value="UPDATE_USER">UPDATE_USER</SelectItem>
                  <SelectItem value="CREATE_PATIENT">CREATE_PATIENT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 text-xs bg-background/60">
                  <SelectValue placeholder="Role Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actor Roles</SelectItem>
                  <SelectItem value="doctor">Doctors</SelectItem>
                  <SelectItem value="technician">Technicians</SelectItem>
                  <SelectItem value="admin">Administrators</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-foreground">Audit Log Stream</CardTitle>
            <span className="text-xs text-muted-foreground font-mono">{logs.length} events displayed</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading audit records...</div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <History className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">No audit records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border/80">
                  <tr>
                    <th className="py-3 pl-4">Timestamp (UTC)</th>
                    <th className="py-3">Actor</th>
                    <th className="py-3">Role</th>
                    <th className="py-3">Action</th>
                    <th className="py-3">Details</th>
                    <th className="py-3">IP Address</th>
                    <th className="py-3 text-right pr-4">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 pl-4 font-mono text-muted-foreground whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Recent"}
                      </td>
                      <td className="py-3 font-semibold text-foreground">
                        @{log.username}
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {log.role?.toUpperCase() || "SYSTEM"}
                        </Badge>
                      </td>
                      <td className="py-3">{getActionBadge(log.action)}</td>
                      <td className="py-3 text-muted-foreground max-w-xs truncate">
                        {log.details || "System execution"}
                      </td>
                      <td className="py-3 font-mono text-muted-foreground text-[11px]">
                        {log.ipAddress || "127.0.0.1"}
                      </td>
                      <td className="py-3 text-right pr-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedLog(log)}
                          className="h-7 text-xs px-2 text-cyan-400 hover:text-cyan-300"
                        >
                          <Info className="h-3.5 w-3.5 mr-1" /> Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-lg bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-500" />
              Audit Event Breakdown
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              Event ID: {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                <div>
                  <span className="text-muted-foreground">Actor:</span>
                  <p className="font-bold text-foreground">@{selectedLog.username} ({selectedLog.role})</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Action:</span>
                  <p className="font-bold text-cyan-400">{selectedLog.action}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>
                  <p className="font-mono text-foreground">{new Date(selectedLog.timestamp).toUTCString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Client IP:</span>
                  <p className="font-mono text-foreground">{selectedLog.ipAddress || "Localhost"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-foreground">Event Payload / Details:</span>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/60 font-mono text-[11px] text-foreground">
                  {selectedLog.details || "No extended details recorded for this event."}
                </div>
              </div>

              {selectedLog.userAgent && (
                <div className="space-y-1">
                  <span className="font-semibold text-foreground">User Agent:</span>
                  <p className="text-[11px] text-muted-foreground break-all">{selectedLog.userAgent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
