import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, SkipForward } from "lucide-react";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onConfirm: (
    patientId: string,
    patientName: string,
    patientAddress: string,
    patientPhoneNumber: string,
    hospitalName: string
  ) => void;
  onSkip?: () => void;
  currentIndex?: number;
  totalFiles?: number;
  isUploading?: boolean;
}

const validateIndianPhone = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

export function UploadDialog({ 
  open, 
  onOpenChange, 
  file, 
  onConfirm,
  onSkip,
  currentIndex = 0,
  totalFiles = 1,
  isUploading = false
}: UploadDialogProps) {
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [patientPhoneNumber, setPatientPhoneNumber] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    if (open && file) {
      resetForm();
    }
  }, [currentIndex, file]);

  const handlePhoneChange = (value: string) => {
    setPatientPhoneNumber(value);
    if (value && !validateIndianPhone(value)) {
      setPhoneError("Please enter a valid 10-digit Indian phone number (format: XXXXXXXXXX)");
    } else {
      setPhoneError("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateIndianPhone(patientPhoneNumber)) {
      setPhoneError("Please enter a valid Indian phone number");
      return;
    }

    if (patientId && patientName && patientAddress && patientPhoneNumber && hospitalName && patientAge && patientGender) {
      onConfirm(patientId, patientName, patientAddress, patientPhoneNumber, hospitalName);
    }
  };

  const resetForm = () => {
    setPatientId("");
    setPatientName("");
    setPatientAge("");
    setPatientGender("");
    setPatientEmail("");
    setPatientAddress("");
    setPatientPhoneNumber("");
    setHospitalName("");
    setPhoneError("");
  };

  const hasMultipleFiles = totalFiles > 1;
  const isLastFile = currentIndex === totalFiles - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="dialog-upload">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Patient Information</DialogTitle>
            {hasMultipleFiles && (
              <Badge variant="secondary" data-testid="badge-file-progress">
                {currentIndex + 1} of {totalFiles}
              </Badge>
            )}
          </div>
          <DialogDescription>
            Enter complete patient details before uploading the MRI scan. <span className="text-red-500">*</span> indicates required fields
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="patientId">
                  Patient ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patientId"
                  placeholder="PT-2024-001"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  required
                  disabled={isUploading}
                  data-testid="input-patient-id"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="patientAge">
                  Age <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patientAge"
                  type="number"
                  placeholder="45"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  min="1"
                  max="120"
                  required
                  disabled={isUploading}
                  data-testid="input-patient-age"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="patientName">
                  Patient Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patientName"
                  placeholder="John Doe"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                  disabled={isUploading}
                  data-testid="input-patient-name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="patientGender">
                  Gender <span className="text-red-500">*</span>
                </Label>
                <Select value={patientGender} onValueChange={setPatientGender} disabled={isUploading}>
                  <SelectTrigger id="patientGender" data-testid="select-patient-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="patientEmail">
                Email Address
              </Label>
              <Input
                id="patientEmail"
                type="email"
                placeholder="john.doe@example.com"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                disabled={isUploading}
                data-testid="input-patient-email"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="patientPhoneNumber">
                Phone Number (India) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="patientPhoneNumber"
                placeholder="9876543210"
                value={patientPhoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                maxLength={10}
                required
                disabled={isUploading}
                data-testid="input-patient-phone"
                className={phoneError ? "border-red-500" : ""}
              />
              {phoneError && (
                <p className="text-xs text-red-500">{phoneError}</p>
              )}
              <p className="text-xs text-muted-foreground">Format: 10-digit number starting with 6-9</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="patientAddress">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="patientAddress"
                placeholder="123 Main St, City, State PIN"
                value={patientAddress}
                onChange={(e) => setPatientAddress(e.target.value)}
                required
                disabled={isUploading}
                data-testid="input-patient-address"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hospitalName">
                Hospital Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hospitalName"
                placeholder="Central Medical Center"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                required
                disabled={isUploading}
                data-testid="input-hospital-name"
              />
            </div>

            {file && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Selected File</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">{file.name}</p>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 justify-end flex-wrap">
            {hasMultipleFiles && onSkip && !isUploading && (
              <Button
                type="button"
                variant="ghost"
                onClick={onSkip}
                data-testid="button-skip-file"
              >
                <SkipForward className="h-4 w-4 mr-1" />
                Skip This File
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={isUploading}
              data-testid="button-cancel-upload"
            >
              Cancel All
            </Button>
            <Button
              type="submit"
              disabled={!patientId || !patientName || !patientAddress || !patientPhoneNumber || !hospitalName || !patientAge || !patientGender || !!phoneError || isUploading}
              data-testid="button-confirm-upload"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  Upload {hasMultipleFiles && !isLastFile ? "& Next" : "Scan"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
