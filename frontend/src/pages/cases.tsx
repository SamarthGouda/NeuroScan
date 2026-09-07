import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  FolderOpen,
  Search,
  Filter,
  Eye,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Edit,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type { Case } from "@shared/schema";

export default function CasesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Edit Case Modal State
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [editStatus, setEditStatus] = useState("active");
  const [editPriority, setEditPriority] = useState("medium");
  const [editNotes, setEditNotes] = useState("");

  const { data: cases = [], isLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const updateCaseMutation = useMutation({
    mutationFn: async (data: { id: string; status: string; priority: string; notes: string }) => {
      const res = await fetch(`/api/cases/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: data.status, priority: data.priority, notes: data.notes }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update case");
      return await res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Case Status Updated",
        description: `Case ${updated.caseNumber} updated successfully.`,
      });
      setSelectedCase(null);
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message || "Could not update case.",
        variant: "destructive",
      });
    },
  });

  const handleOpenEdit = (c: Case) => {
    setSelectedCase(c);
    setEditStatus(c.status);
    setEditPriority(c.priority);
    setEditNotes(c.notes || "");
  };

  const handleSaveEdit = () => {
    if (!selectedCase) return;
    updateCaseMutation.mutate({
      id: selectedCase.id,
      status: editStatus,
      priority: editPriority,
      notes: editNotes,
    });
  };

  const filteredCases = cases.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      c.patientName?.toLowerCase().includes(q) ||
      c.patientCode?.toLowerCase().includes(q) ||
      c.caseNumber?.toLowerCase().includes(q) ||
      c.tumorType?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || c.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── Case Registry Header ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-card/75 backdrop-blur-2xl border border-white/[0.08] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl shadow-blue-950/20">
        <div className="absolute top-0 right-0 w-96 h-40 bg-gradient-to-bl from-blue-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="space-y-1.5 relative z-10">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2.5 py-0.5">
              Clinical Registry
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-cyan-400 font-mono">{cases.length} Tracked Patient Cases</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Patient Case Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Review patient brain tumor cases, track specialist review progress, update priority tiers,
            and inspect compiled diagnostic reports.
          </p>
        </div>

        <Link href="/upload" className="relative z-10">
          <Button className="bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/25 h-10 px-4 rounded-xl text-xs transition-all hover:scale-[1.02]">
            Analyze New Scan
          </Button>
        </Link>
      </div>

      {/* ─── Filter & Search Instrumentation ──────────────────────────── */}
      <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by case #, patient name, MRN, or tumor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 text-xs bg-background/60 border-border/70 rounded-xl font-mono"
                data-testid="input-search-cases"
              />
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 text-xs bg-background/60 border-border/70 rounded-xl">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-10 text-xs bg-background/60 border-border/70 rounded-xl">
                  <SelectValue placeholder="Priority Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Cases Registry Table ─────────────────────────────────────── */}
      <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-border/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-foreground">Tracked Clinical Cases</CardTitle>
            <span className="text-xs text-muted-foreground font-mono">{filteredCases.length} matches</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-muted-foreground font-mono">Loading clinical cases...</div>
          ) : filteredCases.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">No cases found matching filters</p>
              <p className="text-xs text-muted-foreground font-mono">Try adjusting your search query or filter selection.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border/70 font-mono text-[10px]">
                  <tr>
                    <th className="py-3 pl-6">Case #</th>
                    <th className="py-3">Patient</th>
                    <th className="py-3">AI Finding</th>
                    <th className="py-3">Confidence</th>
                    <th className="py-3">Priority</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Assigned Doctor</th>
                    <th className="py-3 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredCases.map((c) => (
                    <tr key={c.id} className="hover:bg-cyan-500/[0.03] transition-colors">
                      <td className="py-3.5 pl-6 font-mono font-bold text-cyan-400">{c.caseNumber}</td>
                      <td className="py-3.5">
                        <div>
                          <p className="font-bold text-foreground">{c.patientName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{c.patientCode}</p>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] px-2 py-0.5 ${
                            c.tumorType && c.tumorType !== "No Tumor"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30 font-semibold"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold"
                          }`}
                        >
                          {c.tumorType || "Processing"}
                        </Badge>
                      </td>
                      <td className="py-3.5 font-mono font-bold text-foreground">
                        {c.confidence ? `${(c.confidence * 100).toFixed(1)}%` : "N/A"}
                      </td>
                      <td className="py-3.5">
                        <Badge
                          className={`font-mono text-[10px] px-2 py-0.5 ${
                            c.priority === "urgent"
                              ? "bg-rose-500 text-white font-bold"
                              : c.priority === "high"
                              ? "bg-orange-500 text-white"
                              : c.priority === "medium"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {c.priority.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3.5">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] px-2 py-0.5 ${
                            c.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : c.status === "under_review"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {c.status === "under_review" ? "UNDER REVIEW" : c.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-muted-foreground font-mono">{c.assignedDoctor || "Dr. Sarah Chen"}</td>
                      <td className="py-3.5 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(c)}
                            className="h-7 text-xs px-2 hover:bg-muted rounded-lg"
                            title="Edit Status / Notes"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Link href={`/scan/${c.scanId}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 rounded-lg">
                              <Eye className="h-3.5 w-3.5 mr-1" /> Scan
                            </Button>
                          </Link>
                          <Link href={`/report/${c.scanId}`}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-muted rounded-lg">
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
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

      {/* ─── Edit Case Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
        <DialogContent className="sm:max-w-md border-border/80 bg-slate-950 text-slate-100 p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-mono">
              Update Case — {selectedCase?.caseNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-mono">
              Patient: {selectedCase?.patientName} ({selectedCase?.patientCode})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-200 font-mono">Review Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="h-9 text-xs bg-slate-900 border-slate-800 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-200 font-mono">Priority Tier</Label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger className="h-9 text-xs bg-slate-900 border-slate-800 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-200 font-mono">Physician Notes & Impression</Label>
              <Textarea
                rows={4}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Enter clinical review notes or biopsy / surgery recommendations..."
                className="text-xs bg-slate-900 border-slate-800 rounded-xl font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedCase(null)} className="rounded-xl border-slate-800">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={updateCaseMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl shadow-md shadow-cyan-500/20"
            >
              {updateCaseMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
