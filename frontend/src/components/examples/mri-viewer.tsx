import { MRIViewer } from "../mri-viewer";

export default function MRIViewerExample() {
  const mockImageUrl = "https://via.placeholder.com/512x512/1a1a1a/ffffff?text=MRI+Scan";

  return (
    <div className="p-6 max-w-4xl">
      <MRIViewer imageUrl={mockImageUrl} tumorDetected={true} showOverlay={true} />
    </div>
  );
}
