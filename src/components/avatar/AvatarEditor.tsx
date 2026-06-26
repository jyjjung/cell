
"use client";

import type { AvatarData, AvatarMode } from '@/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PixelAvatar } from './PixelAvatar';
import { useAuth } from '@/contexts/auth-context';
import { deriveInitialsFromName, normalizeAvatarInitials } from '@/lib/avatar-utils';
import { SKIN_TONES, HAIR_STYLES, HAIR_COLORS, OUTFITS, ACCESSORIES, OUTFIT_COLORS, ACCESSORY_COLORS, MOUTHS, FACIAL_HAIR_STYLES, FACIAL_HAIR_COLORS, DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import { AVATAR_BACKGROUND_GROUPS, AVATAR_BACKGROUNDS } from '@/lib/avatar-backgrounds';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, User, Dog, Type, Eraser, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { deleteAvatarPhotoAtUrl } from '@/lib/avatar-storage';
import { STORAGE_CACHE_CONTROL } from '@/lib/media-cache';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';
import { Slider } from '@/components/ui/slider';
function BackgroundSelector({
  currentData,
  onDataChange,
}: {
  currentData: AvatarData,
  onDataChange: (data: AvatarData) => void,
}) {
  const BackgroundSwatch = ({ bgKey, gradient }: { bgKey: string, gradient: { stops: { offset: string; color: string }[] } }) => {
    const backgroundId = `grad-swatch-${bgKey}`;
    const isNone = bgKey === 'none';

    return (
        <button
            type="button"
            className={cn(
                "h-10 w-10 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center overflow-hidden bg-muted/20 shrink-0",
                currentData.backgroundColor === bgKey ? 'border-primary ring-2 ring-primary/40' : 'border-border'
            )}
            onClick={() => onDataChange({ ...currentData, backgroundColor: bgKey })}
            aria-label={`Set background to ${bgKey}`}
        >
            {isNone ? (
                <Eraser className="h-5 w-5 text-muted-foreground" />
            ) : (
                <svg viewBox="0 0 1 1" className="h-full w-full">
                    <defs>
                        <linearGradient id={backgroundId} x1="0" y1="0" x2="0" y2="1">
                            {gradient.stops.map((stop, i) => (
                                <stop key={i} offset={stop.offset} stopColor={stop.color} />
                            ))}
                        </linearGradient>
                    </defs>
                    <rect width="1" height="1" fill={`url(#${backgroundId})`} />
                </svg>
            )}
        </button>
    );
  };

  return (
    <div className="mb-6 md:mb-8 space-y-5">
        <h4 className="text-sm font-medium text-muted-foreground">Background</h4>
        {AVATAR_BACKGROUND_GROUPS.map((group) => {
          const entries = Object.entries(AVATAR_BACKGROUNDS).filter(([, def]) => def.group === group.id);
          if (entries.length === 0) return null;

          return (
            <div key={group.id} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground/80 px-1">{group.label}</p>
              <ScrollArea className="w-full whitespace-nowrap pb-2">
                <div className="flex gap-3 px-1 py-1">
                  {entries.map(([key, def]) => (
                    <BackgroundSwatch key={key} bgKey={key} gradient={{ stops: def.stops }} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          );
        })}
    </div>
  );
}

function CustomBuilderControls({
  currentData,
  onDataChange,
}: {
  currentData: AvatarData,
  onDataChange: (data: AvatarData) => void,
}) {
  const ColorSwatch = ({ color, field, value }: { color: string, field: keyof AvatarData, value: string }) => (
    <button
      type="button"
      className={cn(
        "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 shrink-0",
        currentData[field] === value ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      )}
      style={{ backgroundColor: color }}
      onClick={() => onDataChange({ ...currentData, [field]: value })}
      aria-label={`Set ${field} to ${value}`}
    />
  );
  
  const StyleButton = ({ field, value, children }: { field: keyof AvatarData, value: string, children: React.ReactNode }) => (
     <Button
        variant={currentData[field] === value ? 'default' : 'outline'}
        size="sm"
        onClick={() => onDataChange({ ...currentData, [field]: value })}
        className="capitalize rounded-xl px-4 h-9"
      >
        {children}
    </Button>
  );

  return (
    <ScrollArea className="h-[300px] md:h-[450px] pr-4">
        <div className="space-y-6 md:space-y-8 pb-8">
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Skin tone</h4>
                <div className="flex flex-wrap gap-3 p-1">
                    {SKIN_TONES.map(color => <ColorSwatch key={color} color={color} field="skinTone" value={color} />)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Mouth</h4>
                <div className="flex flex-wrap gap-2 p-1">
                    {Object.keys(MOUTHS).map(mouthStyle => <StyleButton key={mouthStyle} field="mouth" value={mouthStyle}>{mouthStyle}</StyleButton>)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Hair style</h4>
                <div className="flex flex-wrap gap-2 p-1">
                    {Object.keys(HAIR_STYLES).map(hairStyle => <StyleButton key={hairStyle} field="hairStyle" value={hairStyle}>{hairStyle}</StyleButton>)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Hair colour</h4>
                <div className="flex flex-wrap gap-3 p-1">
                    {HAIR_COLORS.map(color => <ColorSwatch key={color} color={color} field="hairColor" value={color} />)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Facial hair</h4>
                <div className="flex flex-wrap gap-2 p-1">
                    {Object.keys(FACIAL_HAIR_STYLES).map(style => <StyleButton key={style} field="facialHair" value={style}>{style}</StyleButton>)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Outfit</h4>
                <div className="flex flex-wrap gap-2 p-1">
                    {Object.keys(OUTFITS).map(outfitStyle => <StyleButton key={outfitStyle} field="outfit" value={outfitStyle}>{outfitStyle}</StyleButton>)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Outfit colour</h4>
                <div className="flex flex-wrap gap-3 p-1">
                    {OUTFIT_COLORS.map(color => <ColorSwatch key={color} color={color} field="outfitColor" value={color} />)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Accessories</h4>
                <div className="flex flex-wrap gap-2 p-1">
                    {Object.keys(ACCESSORIES).map(accessoryStyle => <StyleButton key={accessoryStyle} field="accessory" value={accessoryStyle}>{accessoryStyle}</StyleButton>)}
                </div>
            </div>
        </div>
    </ScrollArea>
  );
}

function InitialsControls({
    currentData,
    onDataChange
}: {
    currentData: AvatarData,
    onDataChange: (data: AvatarData) => void
}) {
    return (
        <div className="flex flex-col items-center justify-center h-[250px] md:h-[300px] text-center gap-6">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold">Initials</h3>
                <p className="text-sm text-muted-foreground max-w-xs">Up to two letters shown on your avatar.</p>
            </div>
            <div className="w-full max-w-[200px]">
                <Input 
                    value={currentData.initials || ''} 
                    onChange={(e) => onDataChange({ ...currentData, initials: e.target.value.trim().substring(0, 2).toUpperCase() })}
                    placeholder="AA"
                    className="h-12 text-center text-xl font-semibold rounded-xl border bg-muted/20"
                />
                <p className="text-xs text-muted-foreground mt-2">Max 2 characters</p>
            </div>
        </div>
    )
}

function GenerativeControls({
    mode,
    currentData,
    onDataChange
}: {
    mode: AvatarMode,
    currentData: AvatarData,
    onDataChange: (data: AvatarData) => void
}) {
    const shuffle = () => {
        const newSeed = Math.random().toString(36).substring(7);
        onDataChange({ ...currentData, mode, seed: newSeed });
    }

    return (
        <div className="flex flex-col items-center justify-center h-[250px] md:h-[300px] text-center gap-6">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold capitalize">{mode}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">Generate a random avatar from this style.</p>
            </div>
            <Button onClick={shuffle} size="lg" className="rounded-xl">
                <RefreshCw className="mr-2 h-4 w-4" />
                Shuffle
            </Button>
        </div>
    )
}

function ImageUploadControls({
    currentData,
    onDataChange,
    uploadUid,
}: {
    currentData: AvatarData,
    onDataChange: (data: AvatarData) => void,
    uploadUid?: string,
}) {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Cropping states
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            
            if (!file.type.startsWith('image/')) {
                toast({ variant: "destructive", title: "Invalid file", description: "Please upload an image file." });
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                toast({ variant: "destructive", title: "File too large", description: "Maximum file size is 5MB." });
                return;
            }

            const reader = new FileReader();
            reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || null));
            reader.readAsDataURL(file);
            
            // Reset input so the same file can be selected again if needed
            e.target.value = '';
        }
    };

    const handleUpload = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        try {
            setIsUploading(true);
            setUploadProgress(0);

            // Generate the cropped image blob
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
            
            if (!croppedImageBlob) {
                throw new Error("Failed to crop image");
            }

            const uid = uploadUid || currentUser?.uid;
            if (!uid) {
                throw new Error('You must be signed in to upload a profile photo.');
            }

            const previousImageUrl = currentData.imageUrl;
            const storagePath = `avatars/${uid}_${Date.now()}_cropped.jpg`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = uploadBytesResumable(storageRef, croppedImageBlob, {
                contentType: croppedImageBlob.type || 'image/jpeg',
                cacheControl: STORAGE_CACHE_CONTROL
            });

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    setIsUploading(false);
                    toast({ variant: "destructive", title: "Upload failed", description: error.message });
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    onDataChange({ ...currentData, mode: 'image', imageUrl: downloadURL });
                    if (previousImageUrl && previousImageUrl !== downloadURL) {
                      await deleteAvatarPhotoAtUrl(previousImageUrl);
                    }
                    setIsUploading(false);
                    setImageSrc(null); // Close the cropper UI
                }
            );
        } catch (error: any) {
            setIsUploading(false);
            toast({ variant: "destructive", title: "Upload failed", description: error.message || "An unknown error occurred" });
        }
    };

    if (imageSrc) {
        return (
            <div className="flex flex-col h-[300px] md:h-[400px] gap-4 w-full max-w-md mx-auto">
                <div className="relative flex-1 rounded-2xl overflow-hidden bg-black w-full min-h-[200px]">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>
                
                <div className="flex items-center gap-4 px-2">
                    <span className="text-xs font-semibold text-muted-foreground">Zoom</span>
                    <Slider 
                        value={[zoom]} 
                        min={1} 
                        max={3} 
                        step={0.1} 
                        onValueChange={(val) => setZoom(val[0])} 
                    />
                </div>
                
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => setImageSrc(null)}
                        disabled={isUploading}
                        className="flex-1 rounded-xl"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="flex-1 rounded-xl font-semibold relative overflow-hidden"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin relative z-10" />
                                <span className="relative z-10">Uploading {Math.round(uploadProgress)}%</span>
                                <div 
                                    className="absolute top-0 left-0 bottom-0 bg-primary/30 z-0 transition-all duration-300" 
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </>
                        ) : (
                            "Save"
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-[250px] md:h-[300px] text-center gap-6">
            <div className="space-y-2">
                <h3 className="text-section-title">Custom image</h3>
                <p className="text-sm text-muted-foreground max-w-xs">Upload a profile photo.</p>
            </div>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
            />
            
            <Button 
                onClick={() => fileInputRef.current?.click()} 
                size="lg" 
                className="rounded-2xl h-14 px-8 font-semibold"
            >
                <Upload className="mr-2 h-5 w-5" />
                Select image
            </Button>
            
            {currentData.mode === 'image' && currentData.imageUrl && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onDataChange({ ...currentData, imageUrl: undefined, mode: 'custom' })}
                    className="text-muted-foreground hover:text-destructive"
                >
                    Remove Image
                </Button>
            )}
        </div>
    )
}

interface AvatarEditorProps {
    value: AvatarData;
    onChange: (data: AvatarData) => void;
    /** Upload profile photos under this uid (for avatar curator editing another member). */
    uploadUid?: string;
}

export function AvatarEditor({
    value,
    onChange,
    uploadUid,
}: AvatarEditorProps) {
  const currentMode = value.mode || 'custom';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
      <div className="md:col-span-1 flex flex-col items-center justify-center stack-gap-sm p-6 md:p-8 widget-surface">
        <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-background shadow-2xl shadow-primary/10">
            <PixelAvatar avatar={value} className="w-full h-full" />
        </div>
        <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">Preview</p>
            <p className="text-xs text-muted-foreground font-medium italic">"{value.initials || value.seed || 'Unique Sequence'}"</p>
        </div>
      </div>

      <div className="md:col-span-2">
        <BackgroundSelector currentData={value} onDataChange={onChange} />
        
        <Tabs value={currentMode} onValueChange={(val) => onChange({ ...value, mode: val as AvatarMode })} className="w-full">
            <TabsList className="grid grid-cols-4 lg:grid-cols-4 h-12 md:h-14 p-1 bg-muted/20 rounded-2xl gap-1">
                <TabsTrigger value="custom" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><User className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="animal" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Dog className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="initials" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Type className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="image" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><ImageIcon className="h-4 w-4" /></TabsTrigger>
            </TabsList>

            <div className="mt-6 md:mt-8">
                <TabsContent value="custom">
                    <CustomBuilderControls currentData={value} onDataChange={onChange} />
                </TabsContent>
                <TabsContent value="animal">
                    <GenerativeControls mode="animal" currentData={value} onDataChange={onChange} />
                </TabsContent>
                <TabsContent value="initials">
                    <InitialsControls currentData={value} onDataChange={onChange} />
                </TabsContent>
                <TabsContent value="image">
                    <ImageUploadControls currentData={value} onDataChange={onChange} uploadUid={uploadUid} />
                </TabsContent>
            </div>
        </Tabs>
      </div>
    </div>
  );
}
