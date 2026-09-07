import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Brain } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 text-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_0%,transparent_70%)] pointer-events-none" />
      
      <Card className="w-full max-w-md mx-4 border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl relative z-10">
        <CardContent className="pt-8 pb-8 px-6 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive shadow-lg shadow-destructive/10">
            <AlertCircle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              HTTP 404 • Resource Unreachable
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Clinical Slice Not Found</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The requested DICOM sequence, patient record, or workstation view does not exist or has been relocated.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/">
              <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-xs h-10 shadow-lg shadow-cyan-500/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Command Center
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
