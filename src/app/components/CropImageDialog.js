"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { getCroppedImg } from "./utils/cropImage";
import { Loader2 } from "lucide-react";

export default function CropImageDialog({ image, open, onClose, onCropComplete, uploading }) {
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropDone = async () => {
    if (!croppedAreaPixels) return;
    const croppedImage = await getCroppedImg(image, croppedAreaPixels);
    onCropComplete(croppedImage);
  };

  const onCropChange = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(val) => !uploading && onClose(val)}>
      <DialogContent className="max-w-[90vw] w-[500px]">
        <div className="relative w-full h-[300px] bg-gray-100">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropChange}
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium mb-1 block">Zoom</label>
          <Slider
            value={[zoom]}
            onValueChange={(v) => setZoom(v[0])}
            min={1}
            max={3}
            step={0.1}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onClose()} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={onCropDone} disabled={uploading}>
            {uploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </span>
            ) : (
              "Crop & Upload"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
