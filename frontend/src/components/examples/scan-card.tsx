import { ScanCard } from "../scan-card";

export default function ScanCardExample() {
  const mockScans = [
    {
      id: "1",
      patientId: "PT-2024-001",
      patientName: "John Doe",
      uploadDate: new Date(Date.now() - 1000 * 60 * 30),
      status: "completed" as const,
      tumorType: "Benign Meningioma",
      confidence: 94,
    },
    {
      id: "2",
      patientId: "PT-2024-002",
      patientName: "Jane Smith",
      uploadDate: new Date(Date.now() - 1000 * 60 * 60 * 2),
      status: "analyzing" as const,
    },
  ];

  return (
    <div className="p-6 grid gap-4 md:grid-cols-2">
      {mockScans.map((scan) => (
        <ScanCard
          key={scan.id}
          {...scan}
          onView={(id) => console.log("View scan:", id)}
          onDownload={(id) => console.log("Download report:", id)}
        />
      ))}
    </div>
  );
}
