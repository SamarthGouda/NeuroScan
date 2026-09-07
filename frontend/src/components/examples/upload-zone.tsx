import { UploadZone } from "../upload-zone";

export default function UploadZoneExample() {
  return (
    <div className="p-6">
      <UploadZone onUpload={(files) => console.log("File uploaded:", files[0]?.name)} />
    </div>
  );
}
