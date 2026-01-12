"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { getCroppedImg } from "./utils/cropImage";
import {
  Loader2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  FlipHorizontal,
  FlipVertical,
  Square,
  Circle,
  RectangleHorizontal,
  Image as ImageIcon,
  RefreshCw,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

// Aspect ratio presets (react-easy-crop requires a fixed aspect ratio for the crop box)
const ASPECT_RATIOS = [
  { label: "Square", value: 1, icon: Square },
  { label: "Circle", value: 1, icon: Circle },
  { label: "Portrait", value: 3 / 4, icon: ImageIcon },
  { label: "4:3", value: 4 / 3, icon: RectangleHorizontal },
  { label: "16:9", value: 16 / 9, icon: RectangleHorizontal },
  { label: "Banner", value: 21 / 9, icon: Maximize2 },
];

export default function CropImageDialog({
  image,
  open,
  onClose,
  onCropComplete,
  onCancel, // NEW: Callback when user cancels - parent can reset state for re-upload
  uploading,
  defaultAspect = 1,
  cropShape = "rect", // "rect" or "round"
  showGrid = true,
  title = "Crop & Edit Image"
}) {
  // Crop states
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // UI states
  const [selectedAspect, setSelectedAspect] = useState(defaultAspect);
  const [isCircleCrop, setIsCircleCrop] = useState(cropShape === "round");
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Upload states
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle, uploading, success, error
  const [errorMessage, setErrorMessage] = useState("");

  const isProcessing = uploadStatus === "uploading" || uploading;
  const isSuccess = uploadStatus === "success";
  const isError = uploadStatus === "error";

  // Prevent page refresh/close while uploading
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isProcessing) {
        e.preventDefault();
        e.returnValue = "Upload in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    if (isProcessing) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isProcessing]);

  const onCropDone = async () => {
    if (!croppedAreaPixels) return;

    try {
      setUploadStatus("uploading");
      setErrorMessage("");

      const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation, { flipH, flipV });

      // Call parent's upload handler
      await onCropComplete(croppedImage);

      setUploadStatus("success");

      // Auto-close after success animation
      setTimeout(() => {
        handleClose(true); // true = successful close
      }, 1500);

    } catch (error) {
      console.error("Crop error:", error);
      setUploadStatus("error");
      setErrorMessage(error.message || "Failed to process image");
    }
  };

  const resetState = () => {
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setUploadStatus("idle");
    setErrorMessage("");
  };

  // Handle dialog close with cancel callback
  const handleClose = (isSuccess = false) => {
    if (isProcessing) return; // Prevent close during upload

    resetState();

    if (!isSuccess && onCancel) {
      // User cancelled - notify parent to allow re-upload
      onCancel();
    }

    onClose();
  };

  // Handle cancel button click
  const handleCancel = () => {
    if (isProcessing) return;
    handleClose(false);
  };

  const onCropChange = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleRotate = (direction) => {
    setRotation((prev) => (direction === "left" ? prev - 90 : prev + 90) % 360);
  };

  const handleFlip = (axis) => {
    if (axis === "h") setFlipH((prev) => !prev);
    else setFlipV((prev) => !prev);
  };

  const handleAspectChange = (ratio) => {
    setSelectedAspect(ratio.value);
    setIsCircleCrop(ratio.label === "Circle");
  };

  const handleZoom = (direction) => {
    setZoom((prev) => {
      const newZoom = direction === "in" ? prev + 0.2 : prev - 0.2;
      return Math.min(Math.max(newZoom, 1), 3);
    });
  };

  // Handle dialog open change (clicking outside, pressing escape, etc.)
  const handleOpenChange = (newOpen) => {
    if (!newOpen && isProcessing) {
      // Don't allow close during upload
      return;
    }
    if (!newOpen) {
      handleClose(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-[600px] p-0 overflow-hidden"
        onPointerDownOutside={(e) => {
          // Prevent closing by clicking outside during upload
          if (isProcessing) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing by pressing Escape during upload
          if (isProcessing) {
            e.preventDefault();
          }
        }}
        // Hide the default close button when processing
        hideCloseButton={isProcessing}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              {title}
            </DialogTitle>
            {/* Custom close button that respects processing state */}
            {!isProcessing && (
              <button
                onClick={handleCancel}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            )}
          </div>
          <DialogDescription>
            {isProcessing
              ? "⚠️ Please wait - upload in progress. Do not close or refresh."
              : "Adjust your image by zooming, rotating, or flipping. Choose an aspect ratio that fits your needs."
            }
          </DialogDescription>
        </DialogHeader>

        {/* Crop Area */}
        <div className="relative w-full h-[300px] sm:h-[350px] bg-muted/50">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            {...(selectedAspect !== null && { aspect: selectedAspect })}
            cropShape={isCircleCrop ? "round" : "rect"}
            showGrid={showGrid}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropChange}
            style={{
              containerStyle: {
                transform: `scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
              },
            }}
          />

          {/* Success Overlay */}
          {isSuccess && (
            <div className="absolute inset-0 bg-green-500/90 flex flex-col items-center justify-center z-50 animate-in fade-in duration-300">
              <div className="bg-white rounded-full p-4 mb-4 animate-in zoom-in duration-300">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <p className="text-white text-lg font-semibold">Upload Successful!</p>
              <p className="text-white/80 text-sm">Your image has been saved</p>
            </div>
          )}

          {/* Error Overlay */}
          {isError && (
            <div className="absolute inset-0 bg-red-500/90 flex flex-col items-center justify-center z-50 animate-in fade-in duration-300">
              <div className="bg-white rounded-full p-4 mb-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <p className="text-white text-lg font-semibold">Upload Failed</p>
              <p className="text-white/80 text-sm">{errorMessage || "Please try again"}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setUploadStatus("idle")}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Processing Overlay */}
          {isProcessing && !isSuccess && !isError && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50">
              <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
              <p className="text-white font-medium">Processing & Uploading...</p>
              <p className="text-white/70 text-sm">Please wait, do not close this window</p>
              <div className="mt-4 bg-white/20 rounded-full px-4 py-2">
                <p className="text-white/90 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  Closing or refreshing will cancel the upload
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls Section */}
        <div className={cn(
          "px-6 py-4 space-y-4 border-t transition-opacity",
          isProcessing && "opacity-50 pointer-events-none"
        )}>
          {/* Aspect Ratio Selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">
              Aspect Ratio
            </label>
            <div className="flex gap-2 flex-wrap">
              {ASPECT_RATIOS.map((ratio) => {
                const Icon = ratio.icon;
                const isActive = selectedAspect === ratio.value && (ratio.label !== "Circle" || isCircleCrop);
                return (
                  <Button
                    key={ratio.label}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleAspectChange(ratio)}
                    disabled={isProcessing}
                    className={cn(
                      "gap-1.5 transition-all",
                      isActive && "ring-2 ring-primary/30"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {ratio.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Zoom Control */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Zoom
              </label>
              <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleZoom("out")}
                disabled={zoom <= 1 || isProcessing}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Slider
                value={[zoom]}
                onValueChange={(v) => setZoom(v[0])}
                min={1}
                max={3}
                step={0.05}
                disabled={isProcessing}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleZoom("in")}
                disabled={zoom >= 3 || isProcessing}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Rotation & Transform Controls */}
          <div className="flex items-center gap-4">
            {/* Rotation */}
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">
                Rotate
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRotate("left")}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  -90°
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRotate("right")}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <RotateCw className="w-4 h-4 mr-1" />
                  +90°
                </Button>
              </div>
            </div>

            {/* Flip */}
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">
                Flip
              </label>
              <div className="flex gap-2">
                <Button
                  variant={flipH ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFlip("h")}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <FlipHorizontal className="w-4 h-4 mr-1" />
                  H
                </Button>
                <Button
                  variant={flipV ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFlip("v")}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <FlipVertical className="w-4 h-4 mr-1" />
                  V
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t bg-muted/30 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetState}
            disabled={isProcessing}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={onCropDone}
              disabled={isProcessing || isSuccess}
              className="min-w-[140px] dark:text-white"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </span>
              ) : isSuccess ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Done!
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Move className="w-4 h-4" />
                  Crop & Upload
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
