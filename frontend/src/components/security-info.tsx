import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Database, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SecurityInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Data Security & Compliance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-chart-2 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium mb-1">End-to-End Encryption</h4>
            <p className="text-xs text-muted-foreground">
              All patient data is encrypted at rest and in transit using AES-256 encryption
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-chart-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium mb-1">Secure Storage</h4>
            <p className="text-xs text-muted-foreground">
              Medical-grade secure servers with automated backups and disaster recovery
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Award className="h-5 w-5 text-chart-4 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium mb-1">Compliance Standards</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Our system follows medical-grade security standards to protect sensitive health information
            </p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">HIPAA Compliant</Badge>
              <Badge variant="secondary" className="text-xs">GDPR Ready</Badge>
              <Badge variant="secondary" className="text-xs">SOC 2 Type II</Badge>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 p-3 rounded-md">
          <p className="text-xs text-muted-foreground">
            <strong>Privacy Guarantee:</strong> Your patient data is never shared with third parties 
            and is only accessible by authorized medical professionals.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
