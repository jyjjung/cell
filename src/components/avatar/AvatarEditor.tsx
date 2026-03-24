
"use client";

import type { AvatarData, AvatarMode } from '@/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PixelAvatar } from './PixelAvatar';
import { SKIN_TONES, HAIR_STYLES, HAIR_COLORS, OUTFITS, ACCESSORIES, OUTFIT_COLORS, ACCESSORY_COLORS, MOUTHS, FACIAL_HAIR_STYLES, FACIAL_HAIR_COLORS, BACKGROUNDS, DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, User, Dog, Zap, Layout, Type, Eraser } from 'lucide-react';

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
    <div className="mb-6 md:mb-8">
        <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Background Canvas</h4>
        <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex gap-3 px-1 py-2">
                {Object.entries(BACKGROUNDS).map(([key, gradient]) => (
                    <BackgroundSwatch key={key} bgKey={key} gradient={gradient} />
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
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
                <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Skin Complexion</h4>
                <div className="flex flex-wrap gap-3 p-1">
                    {SKIN_TONES.map(color => <ColorSwatch key={color} color={color} field="skinTone" value={color} />)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Mouth Expression</h4>
                <div className="flex flex-wrap gap-2 p-1">
                    {Object.keys(MOUTHS).map(mouthStyle => <StyleButton key={mouthStyle} field="mouth" value={mouthStyle}>{mouthStyle}</StyleButton>)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Hair Architecture</h4>
                <div className="flex flex-wrap gap-2 p-1">
                    {Object.keys(HAIR_STYLES).map(hairStyle => <StyleButton key={hairStyle} field="hairStyle" value={hairStyle}>{hairStyle}</StyleButton>)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Hair Pigment</h4>
                <div className="flex flex-wrap gap-3 p-1">
                    {HAIR_COLORS.map(color => <ColorSwatch key={color} color={color} field="hairColor" value={color} />)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Facial Grooming</h4>
                <div className="flex flex-wrap gap-2 p-1">
                    {Object.keys(FACIAL_HAIR_STYLES).map(style => <StyleButton key={style} field="facialHair" value={style}>{style}</StyleButton>)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Outfit Specification</h4>
                <div className="flex flex-wrap gap-2 p-1">
                    {Object.keys(OUTFITS).map(outfitStyle => <StyleButton key={outfitStyle} field="outfit" value={outfitStyle}>{outfitStyle}</StyleButton>)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Outfit Color</h4>
                <div className="flex flex-wrap gap-3 p-1">
                    {OUTFIT_COLORS.map(color => <ColorSwatch key={color} color={color} field="outfitColor" value={color} />)}
                </div>
            </div>
            <div className="space-y-3">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Modular Accessories</h4>
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
                <h3 className="text-xl font-black tracking-tight">Identity Branding</h3>
                <p className="text-sm text-muted-foreground max-w-xs">Define your typographic signature.</p>
            </div>
            <div className="w-full max-w-[200px]">
                <Input 
                    value={currentData.initials || ''} 
                    onChange={(e) => onDataChange({ ...currentData, initials: e.target.value.substring(0, 2).toUpperCase() })}
                    placeholder="AA"
                    className="h-14 text-center text-2xl font-black rounded-2xl border-2 bg-muted/20"
                />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Max 2 Characters</p>
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
                <h3 className="text-xl font-black tracking-tight capitalize">{mode} Mode</h3>
                <p className="text-sm text-muted-foreground max-w-xs">Generate a unique digital identity based on random creative parameters.</p>
            </div>
            <Button onClick={shuffle} size="lg" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest">
                <RefreshCw className="mr-2 h-5 w-5" />
                Shuffle Spectrum
            </Button>
        </div>
    )
}

interface AvatarEditorProps {
    value: AvatarData;
    onChange: (data: AvatarData) => void;
}

export function AvatarEditor({
    value,
    onChange,
}: AvatarEditorProps) {
  const currentMode = value.mode || 'custom';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
      <div className="md:col-span-1 flex flex-col items-center justify-center space-y-4 md:space-y-6 p-6 md:p-8 bg-muted/20 rounded-[2rem] md:rounded-[2.5rem] border border-border/50">
        <div className="w-32 h-32 md:w-48 md:h-48 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-4 border-background shadow-2xl shadow-primary/10">
            <PixelAvatar avatar={value} className="w-full h-full" />
        </div>
        <div className="text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Live Manifestation</p>
            <p className="text-xs text-muted-foreground font-medium italic">"{value.initials || value.seed || 'Unique Sequence'}"</p>
        </div>
      </div>

      <div className="md:col-span-2">
        <BackgroundSelector currentData={value} onDataChange={onChange} />
        
        <Tabs value={currentMode} onValueChange={(val) => onChange({ ...value, mode: val as AvatarMode })} className="w-full">
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-12 md:h-14 p-1 bg-muted/20 rounded-2xl gap-1">
                <TabsTrigger value="custom" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><User className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="animal" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Dog className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="robot" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Zap className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="landscape" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Layout className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="initials" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Type className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="pixel-art" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Px</TabsTrigger>
            </TabsList>

            <div className="mt-6 md:mt-8">
                <TabsContent value="custom">
                    <CustomBuilderControls currentData={value} onDataChange={onChange} />
                </TabsContent>
                <TabsContent value="animal">
                    <GenerativeControls mode="animal" currentData={value} onDataChange={onChange} />
                </TabsContent>
                <TabsContent value="robot">
                    <GenerativeControls mode="robot" currentData={value} onDataChange={onChange} />
                </TabsContent>
                <TabsContent value="landscape">
                    <GenerativeControls mode="landscape" currentData={value} onDataChange={onChange} />
                </TabsContent>
                <TabsContent value="initials">
                    <InitialsControls currentData={value} onDataChange={onChange} />
                </TabsContent>
                <TabsContent value="pixel-art">
                    <GenerativeControls mode="pixel-art" currentData={value} onDataChange={onChange} />
                </TabsContent>
            </div>
        </Tabs>
      </div>
    </div>
  );
}
