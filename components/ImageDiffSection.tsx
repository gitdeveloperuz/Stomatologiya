
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ImageDiffItem, ImageDiffSectionConfig, StyleConfig, FeatureActionButton, GradientConfig, GradientStop } from '../types';
import { ImageDiffSlider } from './ImageDiffSlider';
import { Trash2, Plus, Eye, EyeOff, Settings, X, Palette, Image as ImageIcon, MoveHorizontal, MoveVertical, ExternalLink, Sliders, MousePointerClick, Hand, Move, AlignLeft, AlignCenter, AlignRight, Copy, Maximize, Minimize, LayoutTemplate, Grid } from 'lucide-react';
import { GradientPicker } from './GradientPicker';

interface ImageDiffSectionProps {
  items: ImageDiffItem[];
  config?: ImageDiffSectionConfig;
  style?: StyleConfig;
  isEditing?: boolean;
  onUpdateConfig?: (config: Partial<ImageDiffSectionConfig>) => void;
  onDeleteItem?: (id: string) => void;
  onAddItem?: () => void;
  onUpdateItem?: (id: string, updates: Partial<ImageDiffItem>) => void;
  onDuplicateItem?: (id: string) => void;
}

const generateCSS = (g?: GradientConfig) => {
    if (!g) return undefined;
    const stopsStr = g.stops.sort((a, b) => a.position - b.position).map(s => `${s.color} ${s.position}%`).join(', ');
    if (g.type === 'linear') return `linear-gradient(${g.angle}deg, ${stopsStr})`;
    if (g.type === 'radial') return `radial-gradient(circle at center, ${stopsStr})`;
    if (g.type === 'conic') return `conic-gradient(from ${g.angle}deg at 50% 50%, ${stopsStr})`;
    return `linear-gradient(${g.angle}deg, ${stopsStr})`;
};

export const ImageDiffSection: React.FC<ImageDiffSectionProps> = ({ items, config, style, isEditing, onUpdateConfig, onDeleteItem, onAddItem, onUpdateItem, onDuplicateItem }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsId, setActiveSettingsId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUpload, setActiveUpload] = useState<{ id: string, type: 'before' | 'after' } | null>(null);

  const [settingsPos, setSettingsPos] = useState({ x: 20, y: 100 });
  const isDraggingSettings = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const [globalSettingsPos, setGlobalSettingsPos] = useState({ x: 20, y: 100 });
  const isDraggingGlobal = useRef(false);
  const globalDragStartPos = useRef({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isVisible = config?.isVisible ?? true;
  const paddingY = config?.paddingY !== undefined ? config.paddingY : 16;
  const sectionGradient = config?.sectionGradient;
  const cardBorderGradient = config?.cardBorderGradient;
  const cardsGap = config?.cardsGap ?? 32; 
  const cardsAlignment = config?.cardsAlignment || 'center';
  const bgColor = config?.bgColor || '#ffffff';
  const legacyBgCSS = (config?.sectionBgGradientStart && config?.sectionBgGradientEnd) ? `linear-gradient(${config.bgDirection || 'to bottom'}, ${config.sectionBgGradientStart}, ${config.sectionBgGradientEnd})` : bgColor;
  const finalSectionBg = sectionGradient ? generateCSS(sectionGradient) : legacyBgCSS;
  const textColor = config?.textColor || '#0f172a';
  const textGradientStart = config?.textColorGradientStart;
  const textGradientEnd = config?.textColorGradientEnd;
  const borderWidth = config?.borderWidth ?? 1;
  const borderRadius = config?.borderRadius ?? 16;
  const beforeLabel = config?.beforeLabel !== undefined ? config.beforeLabel : 'OLDIN';
  const afterLabel = config?.afterLabel !== undefined ? config.afterLabel : 'KEYIN';
  
  // New Configs
  const layoutMode = config?.layoutMode || 'flex';
  const gridColumns = config?.gridColumns || 2;
  const hideHandle = config?.hideHandle || false;
  const handleStyle = config?.handleStyle || 'circle-arrows';
  const labelAlignment = config?.labelAlignment || 'top-left';

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent | TouchEvent) => {
          const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
          const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
          if (isDraggingSettings.current) setSettingsPos({ x: clientX - dragStartPos.current.x, y: clientY - dragStartPos.current.y });
          if (isDraggingGlobal.current) setGlobalSettingsPos({ x: clientX - globalDragStartPos.current.x, y: clientY - globalDragStartPos.current.y });
      };
      const handleMouseUp = () => { isDraggingSettings.current = false; isDraggingGlobal.current = false; };
      if (activeSettingsId || showSettings) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
          window.addEventListener('touchmove', handleMouseMove, { passive: false });
          window.addEventListener('touchend', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('touchmove', handleMouseMove);
          window.removeEventListener('touchend', handleMouseUp);
      }
  }, [activeSettingsId, showSettings]);

  const handleSettingsDragStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (isMobile) return;
      isDraggingSettings.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      dragStartPos.current = { x: clientX - settingsPos.x, y: clientY - settingsPos.y };
  };

  const handleGlobalDragStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (isMobile) return;
      isDraggingGlobal.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      globalDragStartPos.current = { x: clientX - globalSettingsPos.x, y: clientY - globalSettingsPos.y };
  };

  const handleUploadClick = (id: string, type: 'before' | 'after') => { setActiveUpload({ id, type }); fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activeUpload && onUpdateItem) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const res = ev.target?.result as string;
              const base64 = res.split(',')[1];
              onUpdateItem(activeUpload.id, { [activeUpload.type === 'before' ? 'beforeImage' : 'afterImage']: base64 });
              setActiveUpload(null);
          };
          reader.readAsDataURL(file);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const parseDimension = (val: string | undefined, defaultVal: number): number => { if (!val) return defaultVal; const num = parseInt(val.replace(/\D/g, '')); return isNaN(num) ? defaultVal : num; };

  if (!isVisible && !isEditing) return null;
  if ((!items || items.length === 0) && !isEditing) return null;

  // Grid Style Construction
  const containerStyle = layoutMode === 'grid' 
      ? { gap: `${cardsGap}px`, display: 'grid', gridTemplateColumns: `repeat(1, 1fr)` } // base mobile
      : { gap: `${cardsGap}px`, justifyContent: cardsAlignment, display: 'flex', flexWrap: 'wrap' as const };

  const gridClass = layoutMode === 'grid' 
      ? `md:grid-cols-2 lg:grid-cols-${gridColumns}` 
      : '';

  // For inline grid style on desktop if using dynamic columns beyond utility classes
  const desktopGridStyle = layoutMode === 'grid' && !isMobile 
      ? { gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` } 
      : {};

  return (
    <section className={`transition-colors relative group/diff ${isEditing ? 'border-y-2 border-dashed border-slate-300 dark:border-slate-700' : ''}`} style={{ paddingTop: `${paddingY * 0.25}rem`, paddingBottom: `${paddingY * 0.25}rem`, background: finalSectionBg }}>
      {/* GLOBAL SETTINGS POPUP (Portal) */}
      {isEditing && showSettings && createPortal(
          <div 
              className={`fixed z-[9999] bg-white dark:bg-slate-900 p-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in text-left flex flex-col ${isMobile ? 'bottom-0 left-0 right-0 rounded-t-2xl border-b-0' : 'rounded-xl w-96'}`} 
              style={isMobile ? { maxHeight: '85vh' } : { top: globalSettingsPos.y, left: globalSettingsPos.x, maxHeight: '80vh' }}
          >
              <div 
                  className={`flex justify-between items-center mb-3 border-b border-slate-100 dark:border-slate-800 pb-2 ${!isMobile ? 'cursor-move' : ''} touch-none`}
                  onMouseDown={handleGlobalDragStart}
                  onTouchStart={handleGlobalDragStart}
              >
                  <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 pointer-events-none"><Move className="h-3 w-3" /> Dizayn Sozlamalari</span>
                  <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><X className="h-4 w-4 text-slate-400" /></button>
              </div>
              <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1 flex-1 pb-4">
                  
                  {/* --- LAYOUT SETTINGS --- */}
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Layout (Joylashuv)</label>
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1 mb-3">
                          <button onClick={() => onUpdateConfig && onUpdateConfig({ layoutMode: 'flex' })} className={`flex-1 text-[10px] py-1.5 rounded flex items-center justify-center gap-1 ${layoutMode === 'flex' ? 'bg-white dark:bg-slate-700 shadow text-primary font-bold' : 'text-slate-500 hover:text-slate-700'}`}>Flex (Auto)</button>
                          <button onClick={() => onUpdateConfig && onUpdateConfig({ layoutMode: 'grid' })} className={`flex-1 text-[10px] py-1.5 rounded flex items-center justify-center gap-1 ${layoutMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-primary font-bold' : 'text-slate-500 hover:text-slate-700'}`}><Grid className="h-3 w-3" /> Grid (Setka)</button>
                      </div>
                      
                      {layoutMode === 'grid' && (
                          <div className="mb-3">
                              <label className="text-[9px] text-slate-400 block mb-1">Ustunlar soni: {gridColumns}</label>
                              <input type="range" min="1" max="4" value={gridColumns} onChange={(e) => onUpdateConfig && onUpdateConfig({ gridColumns: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg accent-primary" />
                              <div className="flex justify-between text-[8px] text-slate-400 mt-1"><span>1</span><span>2</span><span>3</span><span>4</span></div>
                          </div>
                      )}

                      <div className="mb-2"><label className="text-[9px] text-slate-400 block mb-1">Kartalar Orasi: {cardsGap}px</label><input type="range" min="0" max="100" value={cardsGap} onChange={(e) => onUpdateConfig && onUpdateConfig({ cardsGap: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg accent-primary" /></div>
                      
                      {layoutMode === 'flex' && (
                          <>
                            <label className="text-[9px] text-slate-400 block mb-1">Horizontal Tekislash</label>
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1"><button onClick={() => onUpdateConfig && onUpdateConfig({ cardsAlignment: 'left' })} className={`flex-1 p-1 rounded ${cardsAlignment === 'left' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-400'}`}><AlignLeft className="h-3 w-3 mx-auto" /></button><button onClick={() => onUpdateConfig && onUpdateConfig({ cardsAlignment: 'center' })} className={`flex-1 p-1 rounded ${cardsAlignment === 'center' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-400'}`}><AlignCenter className="h-3 w-3 mx-auto" /></button><button onClick={() => onUpdateConfig && onUpdateConfig({ cardsAlignment: 'right' })} className={`flex-1 p-1 rounded ${cardsAlignment === 'right' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-400'}`}><AlignRight className="h-3 w-3 mx-auto" /></button></div>
                          </>
                      )}
                  </div>

                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Section Background</label>
                      <GradientPicker value={sectionGradient} onChange={(g) => onUpdateConfig && onUpdateConfig({ sectionGradient: g })} />
                      <div className="mt-3"><label className="text-[9px] text-slate-400 block mb-1">Padding Vertical: {paddingY * 0.25}rem</label><input type="range" min="0" max="64" value={paddingY} onChange={(e) => onUpdateConfig && onUpdateConfig({ paddingY: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg accent-primary" /></div>
                  </div>
                  
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Slider Sozlamalari</label>
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1 mb-2">
                          <button onClick={() => onUpdateConfig && onUpdateConfig({ interactionMode: 'drag' })} className={`flex-1 text-[10px] py-1.5 rounded flex items-center justify-center gap-1 ${(!config?.interactionMode || config?.interactionMode === 'drag') ? 'bg-white dark:bg-slate-700 shadow text-primary font-bold' : 'text-slate-500 hover:text-slate-700'}`}><MousePointerClick className="h-3 w-3" /> Click/Drag</button>
                          <button onClick={() => onUpdateConfig && onUpdateConfig({ interactionMode: 'hover' })} className={`flex-1 text-[10px] py-1.5 rounded flex items-center justify-center gap-1 ${config?.interactionMode === 'hover' ? 'bg-white dark:bg-slate-700 shadow text-primary font-bold' : 'text-slate-500 hover:text-slate-700'}`}><Hand className="h-3 w-3" /> Hover</button>
                      </div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">Handle Style</label>
                      <select value={handleStyle} onChange={(e) => onUpdateConfig && onUpdateConfig({ handleStyle: e.target.value as any })} className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent mb-2">
                          <option value="circle-arrows">Circle with Arrows</option>
                          <option value="circle">Circle Only</option>
                          <option value="square">Square</option>
                          <option value="line">Line Only</option>
                      </select>
                      <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 cursor-pointer bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                          <input type="checkbox" checked={hideHandle} onChange={(e) => onUpdateConfig && onUpdateConfig({ hideHandle: e.target.checked })} className="accent-primary w-3 h-3" />
                          <span>Tutqichni Yashirish (Global Hide)</span>
                      </label>
                  </div>

                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-2"><label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Card Border Gradient</label><GradientPicker value={cardBorderGradient} onChange={(g) => onUpdateConfig && onUpdateConfig({ cardBorderGradient: g })} /><div className="mt-2 flex gap-2"><div className="flex-1"><label className="text-[9px] text-slate-400 block">Width: {borderWidth}px</label><input type="range" min="0" max="10" value={borderWidth} onChange={(e) => onUpdateConfig && onUpdateConfig({ borderWidth: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg accent-primary" /></div><div className="flex-1"><label className="text-[9px] text-slate-400 block">Radius: {borderRadius}px</label><input type="range" min="0" max="40" value={borderRadius} onChange={(e) => onUpdateConfig && onUpdateConfig({ borderRadius: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg accent-primary" /></div></div></div>
                  
                  <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Overlay Matnlar</label>
                      <div className="grid grid-cols-2 gap-2 mb-2"><input value={beforeLabel} onChange={(e) => onUpdateConfig && onUpdateConfig({ beforeLabel: e.target.value })} className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent" placeholder="OLDIN" /><input value={afterLabel} onChange={(e) => onUpdateConfig && onUpdateConfig({ afterLabel: e.target.value })} className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent" placeholder="KEYIN" /></div>
                      <label className="text-[9px] text-slate-400 block mb-1">Matn Joylashuvi (Align)</label>
                      <select value={labelAlignment} onChange={(e) => onUpdateConfig && onUpdateConfig({ labelAlignment: e.target.value as any })} className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent">
                          <option value="top-left">Yuqori Chap</option>
                          <option value="top-right">Yuqori O'ng</option>
                          <option value="bottom-left">Pastki Chap</option>
                          <option value="bottom-right">Pastki O'ng</option>
                      </select>
                  </div>
                  
                  <div className="pt-2 text-center"><button onClick={() => onUpdateConfig && onUpdateConfig({ bgColor: '', sectionGradient: undefined, cardBorderGradient: undefined, sectionBgGradientStart: '', sectionBgGradientEnd: '' })} className="text-[10px] text-red-500 underline">Reset to Defaults</button></div>
              </div>
          </div>,
          document.body
      )}

      {isEditing && (
          <div className="absolute top-4 left-4 z-20 flex gap-2 items-start">
              <div className="flex gap-2 items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase text-slate-500 px-2">Oldin/Keyin</span>
                  <button onClick={() => onUpdateConfig && onUpdateConfig({ isVisible: !isVisible })} className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${isVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{isVisible ? <><Eye className="h-3 w-3" /> On</> : <><EyeOff className="h-3 w-3" /> Off</>}</button>
                  <button onClick={() => { setShowSettings(!showSettings); if (!showSettings) setGlobalSettingsPos({ x: 20, y: 100 }); }} className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Settings className="h-4 w-4" /></button>
              </div>
          </div>
      )}

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${!isVisible ? 'opacity-50 grayscale' : ''}`}>
        <div className="text-center mb-12 space-y-4">
            {isEditing ? (
                <input value={config?.title || "Bizning Natijalar"} onChange={(e) => onUpdateConfig && onUpdateConfig({ title: e.target.value })} className="text-3xl md:text-4xl font-extrabold text-center w-full bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-primary pb-2" style={{ color: (textGradientStart && textGradientEnd) ? 'transparent' : textColor, backgroundImage: (textGradientStart && textGradientEnd) ? `linear-gradient(to right, ${textGradientStart}, ${textGradientEnd})` : undefined, backgroundClip: (textGradientStart && textGradientEnd) ? 'text' : undefined, WebkitBackgroundClip: (textGradientStart && textGradientEnd) ? 'text' : undefined }} placeholder="Sarlavha" />
            ) : (
                <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: (textGradientStart && textGradientEnd) ? 'transparent' : textColor, backgroundImage: (textGradientStart && textGradientEnd) ? `linear-gradient(to right, ${textGradientStart}, ${textGradientEnd})` : undefined, backgroundClip: (textGradientStart && textGradientEnd) ? 'text' : undefined, WebkitBackgroundClip: (textGradientStart && textGradientEnd) ? 'text' : undefined }}>{config?.title || "Bizning Natijalar"}</h2>
            )}
            {isEditing ? (
                <textarea value={config?.subtitle || "Mijozlarimizning davolanishdan oldingi va keyingi holatlari"} onChange={(e) => onUpdateConfig && onUpdateConfig({ subtitle: e.target.value })} className="w-full max-w-2xl mx-auto text-center bg-transparent border border-dashed border-slate-300 rounded-lg p-2 focus:outline-none focus:border-primary resize-none" style={{ color: textColor }} rows={2} placeholder="Qo'shimcha ma'lumot" />
            ) : (
                <p className="text-lg max-w-2xl mx-auto leading-relaxed opacity-90" style={{ color: textColor }}>{config?.subtitle || "Mijozlarimizning davolanishdan oldingi va keyingi holatlari"}</p>
            )}
        </div>

        <div className={layoutMode === 'grid' ? `grid ${gridClass}` : 'flex flex-wrap'} style={{...containerStyle, ...desktopGridStyle}}>
            {items.map((item) => (
                <div key={item.id} className="relative group flex flex-col items-center transition-all duration-300" style={layoutMode === 'flex' ? { width: item.width || '300px', maxWidth: '100%', flexBasis: item.width || 'auto' } : { width: '100%' }}>
                    <div className="relative w-full h-full">
                        <ImageDiffSlider item={{...item, height: item.height || '300px'}} style={style} config={config} />
                        {isEditing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 bg-black/40 backdrop-blur-sm gap-4 p-4 pointer-events-none">
                                <div className="pointer-events-auto flex flex-col gap-2 bg-white/10 p-4 rounded-xl backdrop-blur-md">
                                    <div className="flex gap-2 justify-center">
                                        <button onClick={() => handleUploadClick(item.id, 'before')} className="px-3 py-2 bg-white/90 text-slate-900 rounded-lg text-xs font-bold hover:bg-white shadow flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Oldin</button>
                                        <button onClick={() => handleUploadClick(item.id, 'after')} className="px-3 py-2 bg-white/90 text-slate-900 rounded-lg text-xs font-bold hover:bg-white shadow flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Keyin</button>
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <button onClick={() => { setActiveSettingsId(activeSettingsId === item.id ? null : item.id); setSettingsPos({ x: 20, y: 100 }); }} className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"><Settings className="h-4 w-4" /> Sozlamalar</button>
                                        <button onClick={() => onDuplicateItem && onDuplicateItem(item.id)} className="py-2 px-3 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors flex items-center justify-center" title="Nusxalash"><Copy className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Individual Card Settings Popover (Portal) */}
                        {isEditing && activeSettingsId === item.id && createPortal(
                            <div 
                                className={`fixed z-[9999] bg-white dark:bg-slate-900 p-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in text-left flex flex-col ${isMobile ? 'bottom-0 left-0 right-0 rounded-t-2xl border-b-0' : 'rounded-xl w-96'}`}
                                style={isMobile ? { maxHeight: '85vh' } : { top: settingsPos.y, left: settingsPos.x, maxHeight: '80vh' }}
                            >
                                <div 
                                    className={`flex justify-between items-center mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 ${!isMobile ? 'cursor-move' : ''} touch-none`}
                                    onMouseDown={handleSettingsDragStart}
                                    onTouchStart={handleSettingsDragStart}
                                >
                                    <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 pointer-events-none"><Move className="h-3 w-3" /> Karta Sozlamalari</span>
                                    <button onClick={() => setActiveSettingsId(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><X className="h-4 w-4 text-slate-400" /></button>
                                </div>

                                <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1 flex-1 pb-4">
                                    <div className="mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Matnlar</label>
                                        <input type="text" value={item.label || ''} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { label: e.target.value })} className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-transparent mb-1 font-bold" placeholder="Sarlavha" />
                                    </div>
                                    <div className="mb-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-2">O'lchamlar</label>
                                        {layoutMode === 'flex' && (
                                            <div className="flex gap-2 mb-2">
                                                <div className="flex-1"><label className="text-[8px] text-slate-400 block">Kenglik</label><input value={item.width || '300px'} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { width: e.target.value })} className="w-full text-[10px] p-2 border rounded bg-transparent" /></div>
                                                <div className="space-y-2 flex-1 pt-4">
                                                    <input type="range" min="200" max="800" step="10" value={parseDimension(item.width, 300)} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { width: `${e.target.value}px` })} className="flex-1 h-2 bg-slate-200 rounded-lg accent-primary w-full" />
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <div className="flex-1"><label className="text-[8px] text-slate-400 block">Balandlik</label><input value={item.height || '300px'} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { height: e.target.value })} className="w-full text-[10px] p-2 border rounded bg-transparent" /></div>
                                            <div className="space-y-2 flex-1 pt-4">
                                                <input type="range" min="200" max="800" step="10" value={parseDimension(item.height, 300)} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { height: `${e.target.value}px` })} className="flex-1 h-2 bg-slate-200 rounded-lg accent-primary w-full" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-2 flex items-center gap-1"><Sliders className="h-3 w-3" /> Advanced</label>
                                        
                                        {/* Handle Style Local Override */}
                                        <div className="mb-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <label className="text-[9px] text-slate-400 block mb-1">Tutqich (Handle)</label>
                                            <select value={item.handleStyle || ''} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { handleStyle: e.target.value as any || undefined })} className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent mb-2">
                                                <option value="">Global Default</option>
                                                <option value="circle-arrows">Circle with Arrows</option>
                                                <option value="circle">Circle Only</option>
                                                <option value="square">Square</option>
                                                <option value="line">Line Only</option>
                                            </select>
                                            <label className="flex items-center gap-2 text-[9px] font-bold text-slate-500 cursor-pointer">
                                                <input type="checkbox" checked={item.hideHandle || false} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { hideHandle: e.target.checked })} className="accent-primary w-3 h-3" />
                                                <span>Yashirish (Hide Handle)</span>
                                            </label>
                                        </div>

                                        <div className="mb-3"><label className="text-[9px] text-slate-400 block mb-1">Matn Joylashuvi</label><div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-1">{['top', 'bottom', 'overlay'].map(layout => (<button key={layout} onClick={() => onUpdateItem && onUpdateItem(item.id, { textLayout: layout as any })} className={`flex-1 text-[10px] py-1.5 rounded capitalize ${item.textLayout === layout || (!item.textLayout && layout === 'top') ? 'bg-white dark:bg-slate-700 shadow text-primary font-bold' : 'text-slate-500'}`}>{layout}</button>))}</div></div>
                                        <div className="mb-3 border-b border-slate-100 dark:border-slate-800 pb-3"><label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Slider Stili</label><div className="flex gap-2 mb-2"><div className="flex-1 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-1"><label className="text-[8px] text-slate-400 block font-bold">Chiziq</label><input type="color" value={item.sliderColor || '#ffffff'} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { sliderColor: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer border-none p-0 bg-transparent" /></div><div className="flex-1 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-1"><label className="text-[8px] text-slate-400 block font-bold">Tutqich</label><input type="color" value={item.handleColor || '#ffffff'} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { handleColor: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer border-none p-0 bg-transparent" /></div></div><div><label className="text-[8px] text-slate-400 block mb-1">Qalinlik: {item.sliderThickness || 4}px</label><input type="range" min="1" max="20" value={item.sliderThickness || 4} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { sliderThickness: parseInt(e.target.value) })} className="w-full h-1 bg-slate-200 rounded-lg accent-primary" /></div></div>
                                        <div className="mb-4 space-y-4">
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"><label className="text-[10px] font-bold text-slate-500 uppercase block mb-3">Sarlavha (Title)</label><div className="mb-3 flex items-center justify-between"><label className="text-[9px] text-slate-400 font-bold">Rang</label><input type="color" value={item.titleColor || '#000000'} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { titleColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0" /></div><label className="text-[9px] text-slate-400 font-bold block mb-1">Gradient</label><GradientPicker value={item.titleGradient} onChange={(g) => onUpdateItem && onUpdateItem(item.id, { titleGradient: g })} /></div>
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"><label className="text-[10px] font-bold text-slate-500 uppercase block mb-3">Izoh (Description)</label><div className="mb-3 flex items-center justify-between"><label className="text-[9px] text-slate-400 font-bold">Rang</label><input type="color" value={item.descColor || '#64748b'} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { descColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0" /></div><label className="text-[9px] text-slate-400 font-bold block mb-1">Gradient</label><GradientPicker value={item.descGradient} onChange={(g) => onUpdateItem && onUpdateItem(item.id, { descGradient: g })} /></div>
                                        </div>
                                        <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3"><div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"><label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Content Background</label><GradientPicker value={item.contentGradient} onChange={(g) => onUpdateItem && onUpdateItem(item.id, { contentGradient: g })} /></div></div>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}

                        {isEditing && <button onClick={() => onDeleteItem && onDeleteItem(item.id)} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-40 pointer-events-auto" title="Butunlay o'chirish"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                    {isEditing && (
                        <div className="mt-2 space-y-1 w-full text-center">
                            <input value={item.label || ''} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { label: e.target.value })} className="w-full text-sm font-bold bg-transparent border-b border-dashed border-slate-300 outline-none text-center" placeholder="Natija Nomi" style={{ color: textColor }} />
                            <textarea value={item.description || ''} onChange={(e) => onUpdateItem && onUpdateItem(item.id, { description: e.target.value })} className="w-full text-xs opacity-70 bg-transparent border-b border-dashed border-slate-300 outline-none text-center resize-none" placeholder="Izoh..." style={{ color: textColor }} rows={2} />
                        </div>
                    )}
                </div>
            ))}
            
            {isEditing && (
                <div onClick={onAddItem} className={`flex flex-col items-center justify-center min-h-[300px] border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group ${layoutMode === 'flex' ? 'w-[320px]' : 'w-full'}`}>
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4 group-hover:bg-primary group-hover:text-white transition-colors"><Plus className="h-8 w-8 text-slate-400 group-hover:text-white" /></div>
                    <p className="font-bold text-slate-400">Yangi Rasm Qo'shish</p>
                </div>
            )}
        </div>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
    </section>
  );
};
