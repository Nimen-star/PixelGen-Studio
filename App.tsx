import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Aperture, Download, Sparkles, History, Trash2, Image as ImageIcon, 
  Loader2, RefreshCw, X, Layers, Wand2, Eraser, Stars, LayoutGrid, 
  AlertTriangle, AlertCircle, RotateCcw, Copy, Check, Settings, Key, 
  Zap, Sun, Moon, Monitor, Palette, Heart, Square, RectangleHorizontal, RectangleVertical, Filter, CheckSquare, MousePointer2,
  ZoomIn, Maximize2, Share2, Plus, Minus, Move, Ratio, Search, ImagePlus, Keyboard, Command, FileUp, PenTool, Undo, Hand, Redo, Droplet, Circle, Sliders, Hash, Ban, ChevronDown, ChevronUp, BookOpen, Camera, Focus, Framer, Lightbulb, Dice5, Scissors
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- API & Config ---
const MODELS = {
  FREE: "gemini-2.5-flash-image",
  PRO: "gemini-3-pro-image-preview",
  GEMINI: "gemini-3-flash-preview"
};

const ACCENT_COLORS = [
  { id: 'indigo', label: 'Indigo', tailwind: 'indigo', hex: '#6366f1', gradient: 'from-indigo-600 via-violet-600 to-indigo-600', shadow: 'shadow-indigo-500/25' },
  { id: 'blue', label: 'Blue', tailwind: 'blue', hex: '#3b82f6', gradient: 'from-blue-600 via-cyan-600 to-blue-600', shadow: 'shadow-blue-500/25' },
  { id: 'purple', label: 'Purple', tailwind: 'purple', hex: '#a855f7', gradient: 'from-purple-600 via-fuchsia-600 to-purple-600', shadow: 'shadow-purple-500/25' },
  { id: 'emerald', label: 'Emerald', tailwind: 'emerald', hex: '#10b981', gradient: 'from-emerald-600 via-teal-600 to-emerald-600', shadow: 'shadow-emerald-500/25' },
  { id: 'rose', label: 'Rose', tailwind: 'rose', hex: '#f43f5e', gradient: 'from-rose-600 via-pink-600 to-rose-600', shadow: 'shadow-rose-500/25' },
  { id: 'amber', label: 'Amber', tailwind: 'amber', hex: '#f59e0b', gradient: 'from-amber-600 via-orange-600 to-amber-600', shadow: 'shadow-amber-500/25' },
];

const STYLES = [
  { 
    id: 'none', 
    label: 'No Style', 
    prompt: '',
    preview: 'https://i.postimg.cc/4NR2McJQ/pixelgen-1767879192468-2166.png'
  },
  { 
    id: 'photo', 
    label: 'Photorealistic', 
    prompt: ', highly detailed, photorealistic, 8k, cinematic lighting, realistic texture, photography, 35mm lens',
    preview: 'https://i.postimg.cc/L6vkTghq/pixelgen-1767879214591-5637.png'
  },
  { 
    id: 'anime', 
    label: 'Anime', 
    prompt: ', anime style, studio ghibli, vibrant colors, detailed line art, cel shaded, manga style, character design',
    preview: 'https://i.postimg.cc/SQfcSY6v/pixelgen-1767879387305-1167.png'
  },
  { 
    id: 'digital', 
    label: 'Digital Art', 
    prompt: ', digital art, concept art, trending on artstation, sharp focus, illustration, highly detailed, dynamic composition, smooth',
    preview: 'https://i.postimg.cc/Y9wmktjD/pixelgen-1767881635996-3506.png'
  },
  { 
    id: '3d', 
    label: '3D Render', 
    prompt: ', 3d render, unreal engine 5, octane render, isometric, cute, low poly, ray tracing, volumetric lighting, cgsociety',
    preview: 'https://i.postimg.cc/8PCfTKPG/pixelgen-1767881753194-744.png'
  },
  { 
    id: 'fantasy', 
    label: 'Fantasy', 
    prompt: ', fantasy art, ethereal, highly detailed, magical atmosphere, cinematic lighting, masterpiece, 8k, dreamlike, intricate',
    preview: 'https://i.postimg.cc/6qb37K5y/pixelgen-1767881796028-2063.png'
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    prompt: ', cyberpunk, neon lights, high tech, low life, futuristic, dystopian, night city, vibrant neon colors, synthwave',
    preview: 'https://i.postimg.cc/CKpKnmYd/pixelgen-1767881861416-4185.png'
  }
];

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square', icon: Square },
  { id: '16:9', label: 'Landscape', icon: RectangleHorizontal },
  { id: '9:16', label: 'Portrait', icon: RectangleVertical },
];

const PROMPT_LIBRARY = {
  'Lighting': ['Cinematic Lighting', 'Golden Hour', 'Volumetric Lighting', 'Studio Lighting', 'Bioluminescent', 'Soft Lighting', 'Rembrandt Lighting'],
  'Camera': ['Macro Lens', 'Wide Angle', 'Telephoto', 'Bokeh', 'Depth of Field', 'Fish-eye', 'ISO 100'],
  'Art Style': ['Oil Painting', 'Watercolor', 'Sketch', 'Pixel Art', 'Vector Art', 'Low Poly', 'Ukiyo-e'],
  'Vibe': ['Ethereal', 'Gritty', 'Whimsical', 'Dark & Moody', 'Minimalist', 'Vibrant', 'Retro']
};

const getClientCoordinates = (e: any) => {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
};

const generateFilename = (prompt: string, id: string | number) => {
    // Create a clean slug from prompt
    const safePrompt = prompt.replace(/[^a-z0-9\s-]/gi, '').trim();
    // Take first 5 words
    const slug = safePrompt.split(/\s+/).slice(0, 5).join('-').toLowerCase();
    // Use a clean random alphanumeric string instead of timestamp
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `pixelgen-${slug || 'creation'}-${randomSuffix}.png`;
};

// Helper to clean up error messages
const formatError = (err: any) => {
    let msg = err.message || "Unknown error";
    // Check for common API errors
    if (msg.includes("403") || msg.includes("PERMISSION_DENIED")) return "Access Denied: Invalid API Key or you do not have permission.";
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) return "Quota Exceeded: You're generating too fast. Please wait a moment.";
    if (msg.includes("SAFETY")) return "Generation blocked by safety settings. Try modifying your prompt.";
    
    // Try parsing JSON error strings
    try {
         const match = msg.match(/\{.*\}/);
         if (match) {
             const json = JSON.parse(match[0]);
             if (json.error && json.error.message) {
                 return json.error.message;
             }
         }
    } catch(e) {}
    
    return msg.length > 150 ? "An unexpected error occurred during generation." : msg;
};

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [batchSize, setBatchSize] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [textLoading, setTextLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Viewer State
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const displayAreaRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  
  // App Features State
  const [searchTerm, setSearchTerm] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [maskAttachment, setMaskAttachment] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Editor State
  const editorCanvasRef = useRef<HTMLCanvasElement>(null); // Committed layer
  const activeLayerRef = useRef<HTMLCanvasElement>(null); // Active stroke layer
  const cursorRef = useRef<HTMLDivElement>(null); // Custom cursor
  const [isCursorInside, setIsCursorInside] = useState(false);
  
  const [brushSize, setBrushSize] = useState(40);
  const [editorTool, setEditorTool] = useState<'brush' | 'eraser' | 'pan'>('brush');
  const [editorHistory, setEditorHistory] = useState<ImageData[]>([]);
  const [editorHistoryStep, setEditorHistoryStep] = useState(-1);
  
  // Editor Zoom/Pan State
  const [editorZoom, setEditorZoom] = useState(1);
  const [editorPan, setEditorPan] = useState({ x: 0, y: 0 });
  const [isEditorPanning, setIsEditorPanning] = useState(false);
  const editorDragStartRef = useRef({ x: 0, y: 0 });

  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Gallery Management State
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStats, setDeleteStats] = useState({ total: 0, favorites: 0 }); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings State
  const [modelType, setModelType] = useState(() => localStorage.getItem('pixelgen_model') || 'free'); 
  const [theme, setTheme] = useState(() => localStorage.getItem('pixelgen_theme') || 'system');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('pixelgen_accent') || 'indigo');
  
  // Temp State for Settings Modal
  const [tempModelType, setTempModelType] = useState('free');
  const [tempTheme, setTempTheme] = useState('system');
  const [tempAccentColor, setTempAccentColor] = useState('indigo');

  // Touch/Pinch Refs
  const viewerTouchStartDist = useRef<number>(0);
  const viewerTouchStartScale = useRef<number>(1);
  const editorPinchStartDist = useRef<number>(0);
  const editorPinchStartScale = useRef<number>(1);
  const editorPinchStartPan = useRef({ x: 0, y: 0 });

  // Styles
  const scrollbarStyles = `
    scrollbar-thin 
    scrollbar-track-transparent 
    scrollbar-thumb-slate-300/60 
    dark:scrollbar-thumb-slate-700/60 
    hover:scrollbar-thumb-slate-400/80 
    dark:hover:scrollbar-thumb-slate-600/80
    [&::-webkit-scrollbar]:w-1.5 
    [&::-webkit-scrollbar]:h-1.5 
    [&::-webkit-scrollbar-track]:bg-transparent 
    [&::-webkit-scrollbar-thumb]:bg-slate-300/60 
    dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/60 
    [&::-webkit-scrollbar-thumb]:rounded-full 
    hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/80 
    dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/80
    transition-colors
  `;

  // --- Zoom Logic (Viewer) ---
  const handleZoomWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY * -0.005;
    const newScale = Math.min(Math.max(1, zoomScale + delta), 4);
    setZoomScale(newScale);
    if (newScale === 1) setPanPosition({ x: 0, y: 0 });
  };

  const startPan = (e: React.MouseEvent | React.TouchEvent) => {
    if (zoomScale > 1) {
      setIsDragging(true);
      const { x, y } = getClientCoordinates(e);
      dragStartRef.current = { x: x - panPosition.x, y: y - panPosition.y };
    }
  };

  const doPan = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDragging && zoomScale > 1) {
      const { x, y } = getClientCoordinates(e);
      setPanPosition({
        x: x - dragStartRef.current.x,
        y: y - dragStartRef.current.y
      });
    }
  };

  const endPan = () => setIsDragging(false);

  const resetZoom = () => {
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const adjustZoom = (delta: number) => {
    const newScale = Math.min(Math.max(1, zoomScale + delta), 4);
    setZoomScale(newScale);
    if (newScale === 1) setPanPosition({ x: 0, y: 0 });
  };

  const handleViewerTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        viewerTouchStartDist.current = dist;
        viewerTouchStartScale.current = zoomScale;
    } else if (e.touches.length === 1) {
        startPan(e);
    }
  };

  const handleViewerTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        if (viewerTouchStartDist.current > 0) {
            const scaleChange = dist / viewerTouchStartDist.current;
            const newScale = Math.min(Math.max(1, viewerTouchStartScale.current * scaleChange), 4);
            setZoomScale(newScale);
            if (newScale === 1) setPanPosition({ x: 0, y: 0 });
        }
    } else {
        doPan(e);
    }
  };

  useEffect(() => {
    if (!isZoomed) resetZoom();
  }, [isZoomed]);


  // --- Settings & Effects ---
  useEffect(() => {
    if (isSettingsOpen) {
        setTempModelType(modelType);
        setTempTheme(theme);
        setTempAccentColor(accentColor);
    }
  }, [isSettingsOpen, modelType, theme, accentColor]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsZoomed(false);
            setIsSettingsOpen(false);
            setShowDeleteConfirm(false);
            setShowShortcuts(false);
            setShowEditor(false);
            setShowLibrary(false);
        }
        
        // Ctrl + Enter to Generate (Strictly Ctrl, no Cmd)
        if (e.ctrlKey && !e.metaKey && e.key === 'Enter') {
            e.preventDefault();
            handleGenerate();
        }

        // Focus Search with '/'
        if (e.key === '/' && !isSettingsOpen && !showShortcuts && !isZoomed && !showEditor && !showLibrary && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
            e.preventDefault();
            setIsSidebarOpen(true);
            const searchInput = document.getElementById('gallery-search');
            if (searchInput) searchInput.focus();
        }

        // Undo/Redo Shortcuts
        if (showEditor) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
            }
        }

        // Delete/Backspace Image (with guard)
        if ((e.key === 'Delete' || e.key === 'Backspace') && !showEditor && !isSettingsOpen && !showDeleteConfirm) {
            // Guard: Do not delete if user is typing in a box
            if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
            
            if (currentImage && !isSelectionMode) {
                // Prevent default backspace nav behavior
                e.preventDefault();
                // Set up for single deletion
                setSelectedIds(new Set([currentImage.id]));
                setDeleteStats({ total: 1, favorites: currentImage.isFavorite ? 1 : 0 });
                setShowDeleteConfirm(true);
            }
        }

        // Viewer Navigation
        if (isZoomed && currentImage && history.length > 0) {
            if (e.key === 'ArrowRight') {
                const idx = history.findIndex(img => img.id === currentImage.id);
                if (idx > -1 && idx < history.length - 1) setCurrentImage(history[idx + 1]);
            }
            if (e.key === 'ArrowLeft') {
                const idx = history.findIndex(img => img.id === currentImage.id);
                if (idx > 0) setCurrentImage(history[idx - 1]);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, selectedStyle, batchSize, aspectRatio, showEditor, editorHistoryStep, editorHistory, isZoomed, currentImage, history]);

  useEffect(() => {
    const root = window.document.documentElement;
    const activeTheme = isSettingsOpen ? tempTheme : theme;
    const applyTheme = (targetTheme: string) => {
        const isDark = targetTheme === 'dark' || (targetTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    };
    applyTheme(activeTheme);
    if (activeTheme === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => applyTheme('system');
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme, tempTheme, isSettingsOpen]);

  // --- Editor Logic ---
  const saveToHistory = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const newHistory = editorHistory.slice(0, editorHistoryStep + 1);
      newHistory.push(imageData);
      setEditorHistory(newHistory);
      setEditorHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
      if (editorHistoryStep > 0) {
          const newStep = editorHistoryStep - 1;
          const canvas = editorCanvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) {
              ctx.putImageData(editorHistory[newStep], 0, 0);
              setEditorHistoryStep(newStep);
          }
      } else if (editorHistoryStep === 0) {
           const canvas = editorCanvasRef.current;
           const ctx = canvas?.getContext('2d');
           if (canvas && ctx) {
                ctx.clearRect(0,0, canvas.width, canvas.height);
                setEditorHistoryStep(-1);
           }
      }
  };

  const handleRedo = () => {
      if (editorHistoryStep < editorHistory.length - 1) {
          const newStep = editorHistoryStep + 1;
          const canvas = editorCanvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) {
              ctx.putImageData(editorHistory[newStep], 0, 0);
              setEditorHistoryStep(newStep);
          }
      }
  };

  const initEditor = () => {
    if (!attachment) return;
    setEditorZoom(1);
    setEditorPan({ x: 0, y: 0 });
    setEditorHistory([]);
    setEditorHistoryStep(-1);

    const img = new Image();
    img.src = attachment;
    img.onload = () => {
        const setCanvasSize = (canvas: HTMLCanvasElement | null) => {
            if (canvas) {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
            }
        };

        setCanvasSize(editorCanvasRef.current);
        setCanvasSize(activeLayerRef.current);

        const ctx = editorCanvasRef.current?.getContext('2d');
        if (ctx) {
            if (maskAttachment) {
                const maskImg = new Image();
                maskImg.src = maskAttachment;
                maskImg.onload = () => {
                    ctx.drawImage(maskImg, 0, 0);
                    saveToHistory(ctx, editorCanvasRef.current!);
                }
            } else {
                ctx.clearRect(0, 0, img.naturalWidth, img.naturalHeight);
            }
        }
    };
  };

  useEffect(() => {
      if (showEditor) {
          setTimeout(initEditor, 50);
          setIsCursorInside(false);
      }
  }, [showEditor]);

  // Editor Zoom/Pan Handlers
  const handleEditorWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      const delta = e.deltaY * -0.002;
      const newScale = Math.min(Math.max(0.5, editorZoom + delta), 5);
      setEditorZoom(newScale);
  };

  const startEditorPan = (e: React.MouseEvent | React.TouchEvent) => {
      const isMouse = e.nativeEvent instanceof MouseEvent;
      const isRightClick = isMouse && (e.nativeEvent as MouseEvent).button === 2;
      const isMiddleClick = isMouse && (e.nativeEvent as MouseEvent).button === 1;

      if (editorTool === 'pan' || isMiddleClick || isRightClick) { 
          setIsEditorPanning(true);
          const { x, y } = getClientCoordinates(e);
          editorDragStartRef.current = { x: x - editorPan.x, y: y - editorPan.y };
      }
  };

  const doEditorPan = (e: React.MouseEvent | React.TouchEvent) => {
      if (isEditorPanning) {
          const { x, y } = getClientCoordinates(e);
          setEditorPan({
              x: x - editorDragStartRef.current.x,
              y: y - editorDragStartRef.current.y
          });
      }
  };

  const endEditorPan = () => {
      setIsEditorPanning(false);
  };

  // Simple ref-based drawing handler
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const startDrawing = (e: any) => {
      if (e.nativeEvent instanceof MouseEvent && e.nativeEvent.button !== 0) return; // Only left click draws

      if (editorTool === 'pan' || isEditorPanning) return;
      
      isDrawingRef.current = true;
      
      const canvas = editorTool === 'eraser' ? editorCanvasRef.current : activeLayerRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const { x: clientX, y: clientY } = getClientCoordinates(e);

      lastPosRef.current = {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
      };
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      }
  };

  const draw = (e: any) => {
      if (!isDrawingRef.current) return;
      
      const canvas = editorTool === 'eraser' ? editorCanvasRef.current : activeLayerRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const { x: clientX, y: clientY } = getClientCoordinates(e);

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      ctx.lineTo(x, y);
      
      ctx.lineWidth = brushSize; 
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (editorTool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1.0;
      } else {
          ctx.globalCompositeOperation = 'source-over';
          // Use solid color for internal mask
          ctx.strokeStyle = ACCENT_COLORS.find(c => c.id === activeAccentColor)?.hex || '#6366f1';
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1.0; 
      }
      
      ctx.stroke();
  };

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
      // Update cursor position and SIZE
      if (cursorRef.current && showEditor && editorCanvasRef.current) {
          const { x, y } = getClientCoordinates(e);
          
          // Calculate the true rendered scale of the image on screen to match brush size
          const rect = editorCanvasRef.current.getBoundingClientRect();
          const visualScale = rect.width / editorCanvasRef.current.width;
          
          const cursorSize = brushSize * visualScale;
          
          cursorRef.current.style.width = `${cursorSize}px`;
          cursorRef.current.style.height = `${cursorSize}px`;
          cursorRef.current.style.marginLeft = `-${cursorSize/2}px`;
          cursorRef.current.style.marginTop = `-${cursorSize/2}px`;
          cursorRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      
      if (isEditorPanning) {
          doEditorPan(e);
      } else if (isDrawingRef.current) {
          draw(e);
      }
  };

  const stopDrawing = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        
        if (editorTool === 'brush') {
            const activeCanvas = activeLayerRef.current;
            const mainCanvas = editorCanvasRef.current;
            
            if (activeCanvas && mainCanvas) {
                const mainCtx = mainCanvas.getContext('2d');
                const activeCtx = activeCanvas.getContext('2d');

                if (mainCtx && activeCtx) {
                    mainCtx.globalAlpha = 1.0; // Always fully opaque for the AI
                    mainCtx.globalCompositeOperation = 'source-over';
                    mainCtx.drawImage(activeCanvas, 0, 0);
                    
                    activeCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
                    activeCtx.beginPath();
                }
            }
        }
        
        const canvas = editorCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.closePath();
            saveToHistory(ctx, canvas);
        }
      }
      setIsEditorPanning(false);
  };
  
  const handleEditorTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
          isDrawingRef.current = false;
          const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          editorPinchStartDist.current = dist;
          editorPinchStartScale.current = editorZoom;

          const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          editorPinchStartPan.current = { x: centerX - editorPan.x, y: centerY - editorPan.y };

      } else if (e.touches.length === 1) {
          if (editorTool === 'pan') {
              startEditorPan(e);
          } else {
              startDrawing(e);
          }
      }
  };

  const handleEditorTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
          const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          if (editorPinchStartDist.current > 0) {
              const scaleChange = dist / editorPinchStartDist.current;
              const newScale = Math.min(Math.max(0.5, editorPinchStartScale.current * scaleChange), 5);
              setEditorZoom(newScale);
          }

          const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          
          setEditorPan({
              x: centerX - editorPinchStartPan.current.x,
              y: centerY - editorPinchStartPan.current.y
          });

      } else {
          if (isEditorPanning) {
              doEditorPan(e);
          } else {
              draw(e);
          }
      }
  };

  const saveMask = () => {
      const canvas = editorCanvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          const pixelBuffer = new Uint32Array(
            ctx!.getImageData(0, 0, canvas.width, canvas.height).data.buffer
          );
          const hasPixels = pixelBuffer.some(color => color !== 0);

          if (hasPixels) {
              setMaskAttachment(canvas.toDataURL());
          } else {
              setMaskAttachment(null);
          }
      }
      setShowEditor(false);
  };

  const clearMask = () => {
      const canvas = editorCanvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          saveToHistory(ctx, canvas);
      }
      setMaskAttachment(null);
  };

  const saveSettings = () => {
    setModelType(tempModelType);
    localStorage.setItem('pixelgen_model', tempModelType);
    setTheme(tempTheme);
    localStorage.setItem('pixelgen_theme', tempTheme);
    setAccentColor(tempAccentColor);
    localStorage.setItem('pixelgen_accent', tempAccentColor);
    setIsSettingsOpen(false);
    setError(null); 
  };

  const resetState = () => {
    setLoading(false);
    setTextLoading(false);
    setError(null);
    setPrompt('');
    setNegativePrompt('');
    setSeed('');
    setAttachment(null);
    setMaskAttachment(null);
    setCurrentImage(null);
  };

  const copyToClipboard = async (text: string, id: number) => {
    try {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
        console.error('Failed to copy', err);
    }
  };

  const copyImageToClipboard = async (imageUrl: string, id: number) => {
      try {
          // Fetch the image to get a blob
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          
          await navigator.clipboard.write([
              new ClipboardItem({
                  [blob.type]: blob
              })
          ]);
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
          console.error("Failed to copy image:", err);
      }
  };

  const handleDownload = (imageUrl: string, id: number | string, promptText: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = generateFilename(promptText, id);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditImage = (image: any) => {
      setAttachment(image.url);
      setMaskAttachment(null);
      // We purposefully don't clear the prompt so the user has context, 
      // but if they want to remix, they should use 'Remix'
      setShowEditor(true);
      setIsZoomed(false); // Close viewer if open
  };

  const handleRemix = (image: any) => {
      // Find original style used
      const styleUsed = STYLES.find(s => s.label === image.style);
      const suffix = styleUsed ? styleUsed.prompt : '';
      
      // Combine user prompt with style suffix
      // Avoid duplicating if the prompt already contains the suffix (edge case)
      let newPrompt = image.prompt;
      if (suffix && !newPrompt.includes(suffix)) {
          newPrompt += suffix;
      }
      
      setPrompt(newPrompt);
      setNegativePrompt(image.negativePrompt || '');
      setSeed(image.seed || ''); // Use saved seed
      
      // Set style to None since we baked the prompt
      setSelectedStyle(STYLES[0]); // 'none'
      
      setAspectRatio(image.aspectRatio || '1:1');
      
      // Logic for advanced settings - ensure it opens if seed is present
      if (image.seed) {
          setShowAdvanced(true);
      }
      
      setIsZoomed(false);
      // Scroll to top of the prompt/main area
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearPrompt = () => {
    setPrompt('');
    setNegativePrompt('');
    setSeed('');
    // Intentionally not clearing attachment/mask so user doesn't lose image
  };

  // --- File Upload Logic ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
        setMaskAttachment(null); // Clear old mask
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAttachment(null);
    setMaskAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Gallery Logic ---
  const toggleFavorite = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHistory(prev => prev.map(item => 
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ));
    if (currentImage && currentImage.id === id) {
        setCurrentImage((prev: any) => ({ ...prev, isFavorite: !prev.isFavorite }));
    }
  };

  const toggleSelection = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
        newSelection.delete(id);
    } else {
        newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedHistory.length && displayedHistory.length > 0) {
        setSelectedIds(new Set());
    } else {
        const allIds = new Set(displayedHistory.map(item => item.id));
        setSelectedIds(allIds);
    }
  };

  const batchToggleFavorite = () => {
    if (selectedIds.size === 0) return;
    const selectedItems = history.filter(item => selectedIds.has(item.id));
    const anyNotFavorite = selectedItems.some(item => !item.isFavorite);
    setHistory(prev => prev.map(item => {
        if (selectedIds.has(item.id)) {
            return { ...item, isFavorite: anyNotFavorite };
        }
        return item;
    }));
    if (currentImage && selectedIds.has(currentImage.id)) {
        setCurrentImage((prev: any) => ({ ...prev, isFavorite: anyNotFavorite }));
    }
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const initiateDelete = () => {
    if (selectedIds.size === 0) return;
    const itemsToDelete = history.filter(item => selectedIds.has(item.id));
    const favoritesCount = itemsToDelete.filter(item => item.isFavorite).length;
    const totalSelected = itemsToDelete.length;
    setDeleteStats({ total: totalSelected, favorites: favoritesCount });
    setShowDeleteConfirm(true);
  };

  const executeDelete = () => {
    setHistory(prev => prev.filter(item => {
        return !selectedIds.has(item.id) || item.isFavorite;
    }));
    if (currentImage && selectedIds.has(currentImage.id) && !currentImage.isFavorite) {
        setCurrentImage(null);
    }
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
  };

  // --- API Calls ---
  const callTextApi = async (systemPrompt: string, userPrompt: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODELS.GEMINI,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt
      }
    });
    return response.text;
  };

  const callImageApi = async (finalPrompt: string, currentAspectRatio: string, base64Attachment: string | null, base64Mask: string | null, effectiveSeed: number) => {
    const isPro = modelType === 'pro';
    const modelName = isPro ? MODELS.PRO : MODELS.FREE;

    // NOTE: Key selection logic moved to handleGenerate to prevent multiple popups

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let augmentedPrompt = finalPrompt;
    if (base64Mask) {
        augmentedPrompt = `${finalPrompt}. Use the provided mask image (second image) to identify the area to edit in the original image (first image). Only change the masked area.`;
    }

    const parts: any[] = [];
    if (base64Attachment) {
        parts.push({
            inlineData: {
                mimeType: base64Attachment.split(';')[0].split(':')[1] || 'image/png',
                data: base64Attachment.split(',')[1]
            }
        });
    }
    if (base64Mask && base64Attachment) {
        parts.push({
            inlineData: {
                mimeType: 'image/png',
                data: base64Mask.split(',')[1]
            }
        });
    }

    parts.push({ text: augmentedPrompt });

    const config: any = { 
        imageConfig: { aspectRatio: currentAspectRatio },
        seed: effectiveSeed
    };

    const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: config
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
             return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image generated.");
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    // Pre-check for API Key if Pro model to avoid multiple popups
    if (modelType === 'pro' && (window as any).aistudio) {
        try {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await (window as any).aistudio.openSelectKey();
            }
        } catch (e) {
            console.warn("API Key check skipped:", e);
        }
    }

    setLoading(true);
    setError(null);
    
    let fullPrompt = `${prompt}${selectedStyle.prompt}`;
    if (negativePrompt.trim()) {
        fullPrompt += ` Do not include: ${negativePrompt}.`;
    }

    let successCount = 0;
    let failCount = 0;
    let lastErrorMessage = "";

    try {
      const promises = Array.from({ length: batchSize }).map(async () => {
        // Generate a deterministic seed for this specific image if one wasn't provided
        const userSeed = (seed && !isNaN(parseInt(seed))) ? parseInt(seed) : null;
        // If user didn't provide a seed, we create a random one to ensure consistency if reused
        const effectiveSeed = userSeed !== null ? userSeed : Math.floor(Math.random() * 2147483647);

        const generateWithRetry = async (retries = 1) => {
            try {
                const imageUrl = await callImageApi(fullPrompt, aspectRatio, attachment, maskAttachment, effectiveSeed);
                return {
                    id: Date.now() + Math.random(),
                    url: imageUrl,
                    prompt: prompt,
                    negativePrompt: negativePrompt,
                    seed: effectiveSeed.toString(), // Save the seed used
                    style: selectedStyle.label,
                    aspectRatio: aspectRatio,
                    status: 'success',
                    model: modelType === 'pro' ? 'Pro' : 'Free',
                    timestamp: new Date().toLocaleTimeString(),
                    isFavorite: false,
                    isNew: true // Flag for animation
                };
            } catch (err: any) {
                if (retries > 0) {
                    console.warn(`Generation failed, retrying... (${retries} attempts left)`);
                    return await generateWithRetry(retries - 1);
                }
                const formattedErr = formatError(err);
                console.warn("Generation failed item:", formattedErr);
                lastErrorMessage = formattedErr;
                return {
                    id: Date.now() + Math.random(),
                    status: 'error',
                    error: formattedErr,
                    prompt: prompt,
                    style: selectedStyle.label,
                    model: modelType === 'pro' ? 'Pro' : 'Free',
                    timestamp: new Date().toLocaleTimeString(),
                    isFavorite: false
                };
            }
        };
        return await generateWithRetry();
      });

      const results = await Promise.all(promises);
      successCount = results.filter(img => img.status === 'success').length;
      failCount = batchSize - successCount;

      setHistory(prev => [...results, ...prev]);
      if (results.length > 0) setCurrentImage(results[0]);
      if (successCount > 0 && results.length > 1) setIsSidebarOpen(true);
      if (failCount > 0) setError(successCount === 0 ? (lastErrorMessage || "Generation failed.") : `Generated ${successCount}, failed ${failCount}.`);
      
      // Remove "isNew" flag after animation plays
      setTimeout(() => {
          setHistory(prev => prev.map(item => ({...item, isNew: false})));
          if (results.length > 0) {
             setCurrentImage((curr: any) => curr ? ({...curr, isNew: false}) : curr);
          }
      }, 1500);

    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSurpriseMe = async () => {
    setTextLoading(true);
    // Scroll to top so user sees the prompt being filled
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const newPrompt = await callTextApi(
        "You are a creative prompt engineer for an AI art generator.",
        "Generate a single, detailed, and creative image generation prompt. It should be descriptive but concise (1-2 sentences). Do not use markdown or quotes."
      );
      if (newPrompt) setPrompt(newPrompt.trim());
    } catch (e) {
      setPrompt("A futuristic city floating in the clouds at sunset, golden hour lighting, cinematic composition");
    } finally {
      setTextLoading(false);
    }
  };

  const handleRefinePrompt = async () => {
    if (!prompt.trim()) return;
    setTextLoading(true);
    try {
      const refined = await callTextApi(
        "You are an expert prompt engineer. Improve the user's prompt by adding descriptive details about the subject, lighting, pose, and composition. CRITICAL: Do NOT add any art style keywords (like 'anime', 'photorealistic'). Keep the description style-neutral.",
        `Enhance this prompt: "${prompt}". Focus on visual content only. Output ONLY the new prompt.`
      );
      if (refined) setPrompt(refined.trim());
    } catch (e) {
      setError("Could not refine prompt. Please try again.");
    } finally {
      setTextLoading(false);
    }
  };
  
  const reusePrompt = (text: string) => {
      setPrompt(text);
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Derived state for live preview
  const activeAccentColor = isSettingsOpen ? tempAccentColor : accentColor;
  const currentGradient = ACCENT_COLORS.find(c => c.id === activeAccentColor)?.gradient || ACCENT_COLORS[0].gradient;

  const displayedHistory = useMemo(() => {
    let filtered = history;
    const lowerTerm = searchTerm.toLowerCase().trim();

    if (showFavoritesOnly) {
      filtered = filtered.filter(item => item.isFavorite);
    }

    if (!lowerTerm) return filtered;

    return filtered.filter(item => {
      const ratioObj = ASPECT_RATIOS.find(r => r.id === item.aspectRatio);
      const ratioLabel = ratioObj ? ratioObj.label.toLowerCase() : '';
      const ratioValue = item.aspectRatio ? item.aspectRatio.toLowerCase() : '';
      const styleLabel = item.style ? item.style.toLowerCase() : '';
      const rawModel = item.model ? item.model.toLowerCase() : '';
      const modelDisplay = rawModel === 'pro' ? 'nano banana pro' : 'nano banana'; 
      const promptText = item.prompt ? item.prompt.toLowerCase() : '';

      return (
        promptText.includes(lowerTerm) ||
        styleLabel.includes(lowerTerm) ||
        modelDisplay.includes(lowerTerm) ||
        rawModel.includes(lowerTerm) ||
        ratioLabel.includes(lowerTerm) ||
        ratioValue.includes(lowerTerm)
      );
    });
  }, [history, searchTerm, showFavoritesOnly]);
  
  const isAllSelected = displayedHistory.length > 0 && selectedIds.size === displayedHistory.length;


  return (
    <div 
        className={`flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-${activeAccentColor}-500 selection:text-white overflow-hidden relative transition-colors duration-500 ${scrollbarStyles}`}
        onDragStart={(e) => {
            if (e.target instanceof HTMLImageElement) {
                e.preventDefault();
            }
        }}
    >
      
      {/* Ambient Background Gradient */}
      <div className={`fixed inset-0 pointer-events-none z-0 opacity-20 dark:opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-${activeAccentColor}-400/40 via-transparent to-transparent transition-colors duration-700`}></div>
      <div className={`fixed bottom-0 left-0 w-full h-1/2 pointer-events-none z-0 opacity-10 dark:opacity-5 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-${activeAccentColor}-600/40 via-transparent to-transparent transition-colors duration-700`}></div>

      {/* Magical Reveal Animation Styles */}
      <style>{`
        img { -webkit-user-drag: none; user-select: none; -webkit-touch-callout: none; }
        @keyframes magicalReveal {
            0% { opacity: 0; transform: scale(0.95) translateY(10px); filter: blur(10px); }
            40% { opacity: 1; transform: scale(1.02) translateY(0); filter: blur(0); }
            100% { opacity: 1; transform: scale(1); }
        }
        .magical-reveal {
            animation: magicalReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Zoom / Lightbox Modal */}
      {isZoomed && currentImage && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300 overflow-hidden"
          onClick={() => setIsZoomed(false)}
        >
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none">
             <div className="flex items-center gap-3 text-white/90 pointer-events-auto bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                 <span className="flex items-center gap-2 font-medium"><Sparkles size={14} className={`text-${activeAccentColor}-400`}/> {currentImage.style}</span>
                 <span className="text-white/20">|</span>
                 <span className="text-sm font-medium">{currentImage.model}</span>
                 <span className="text-white/20">|</span>
                 <span className="text-sm font-medium opacity-80">{currentImage.aspectRatio}</span>
             </div>
             <button onClick={() => setIsZoomed(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors pointer-events-auto backdrop-blur-md border border-white/10">
                <X size={24} />
             </button>
          </div>

          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-move touch-none"
            onWheel={handleZoomWheel}
            onMouseDown={startPan}
            onMouseMove={doPan}
            onMouseUp={endPan}
            onMouseLeave={endPan}
            onTouchStart={handleViewerTouchStart}
            onTouchMove={handleViewerTouchMove}
            onTouchEnd={endPan}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
                style={{ 
                    transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomScale})`,
                    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)' 
                }}
                className="max-w-full max-h-full flex items-center justify-center p-8"
            >
                <img 
                src={currentImage.url} 
                alt={currentImage.prompt}
                draggable={false}
                className="max-w-full max-h-[85vh] object-contain shadow-2xl shadow-black/50 rounded-lg select-none ring-1 ring-white/10"
                />
            </div>
            
            {/* Zoom Controls */}
            <div className="absolute bottom-32 right-8 flex flex-col gap-2 pointer-events-auto">
                 <button onClick={() => adjustZoom(0.5)} className="p-3 bg-black/40 text-white rounded-xl hover:bg-white/20 backdrop-blur-xl border border-white/10 shadow-lg"><Plus size={20}/></button>
                 <button onClick={() => resetZoom()} className="p-3 bg-black/40 text-white rounded-xl hover:bg-white/20 backdrop-blur-xl border border-white/10 shadow-lg text-xs font-bold">1:1</button>
                 <button onClick={() => adjustZoom(-0.5)} className="p-3 bg-black/40 text-white rounded-xl hover:bg-white/20 backdrop-blur-xl border border-white/10 shadow-lg"><Minus size={20}/></button>
            </div>
            
            {/* Nav Hints */}
            {history.length > 1 && (
                <div className="absolute top-1/2 w-full flex justify-between px-4 pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                    <div className="p-4 bg-black/20 rounded-full backdrop-blur-sm"><ChevronDown className="rotate-90 text-white/50" size={32} /></div>
                    <div className="p-4 bg-black/20 rounded-full backdrop-blur-sm"><ChevronDown className="-rotate-90 text-white/50" size={32} /></div>
                </div>
            )}

            {/* Floating Action Bar */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-2xl px-2 py-2 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto z-20">
                 <button 
                    onClick={() => handleDownload(currentImage.url, currentImage.id, currentImage.prompt)}
                    className={`p-4 text-white hover:text-${activeAccentColor}-400 hover:bg-white/10 rounded-xl transition-all relative group`}
                 >
                    <Download size={22} />
                    <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/20 backdrop-blur-md">Download</span>
                 </button>
                 <div className="w-px h-8 bg-white/10 mx-1"></div>
                 {/* Only show edit actions for successful generations */}
                 {currentImage.status === 'success' && (
                    <>
                        <button 
                            onClick={() => handleEditImage(currentImage)}
                            className={`p-4 text-white hover:text-${activeAccentColor}-400 hover:bg-white/10 rounded-xl transition-all relative group`}
                        >
                            <PenTool size={22} />
                            <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/20 backdrop-blur-md">Edit / Inpaint</span>
                        </button>
                        <button 
                            onClick={() => handleRemix(currentImage)}
                            className={`p-4 text-white hover:text-${activeAccentColor}-400 hover:bg-white/10 rounded-xl transition-all relative group`}
                        >
                            <RefreshCw size={22} />
                            <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/20 backdrop-blur-md">Remix Prompt</span>
                        </button>
                    </>
                 )}
                 <div className="w-px h-8 bg-white/10 mx-1"></div>
                 {currentImage.status === 'success' && (
                    <button 
                        onClick={() => toggleFavorite(currentImage.id)}
                        className={`p-4 rounded-xl transition-all hover:bg-white/10 group relative ${currentImage.isFavorite ? 'text-red-500' : 'text-white hover:text-red-500'}`}
                    >
                        <Heart size={22} fill={currentImage.isFavorite ? "currentColor" : "none"} />
                        <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/20 backdrop-blur-md">Favorite</span>
                    </button>
                 )}
            </div>
          </div>
        </div>
      )}
      
      {/* Editor Modal */}
      {showEditor && attachment && (
        <div 
            className="absolute inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300"
            onMouseMove={handleGlobalMouseMove}
            onMouseEnter={() => setIsCursorInside(true)}
            onMouseLeave={() => setIsCursorInside(false)}
        >
           <div className="relative bg-black/40 backdrop-blur-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] w-full max-w-6xl border border-white/10 ring-1 ring-white/5">
               
               {/* Editor Toolbar (Absolute Overlay) */}
               <div className="absolute top-0 left-0 right-0 z-30 flex flex-col lg:flex-row items-center justify-between p-4 border-b border-white/5 bg-black/30 backdrop-blur-md gap-4" onDragStart={(e) => e.preventDefault()}>
                   <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-start">
                       <h3 className="text-white font-bold flex items-center gap-3 text-lg"><PenTool size={20} className={`text-${activeAccentColor}-500`} /> Edit Mask</h3>
                       
                       <div className="flex items-center gap-2">
                           <button onClick={handleUndo} disabled={editorHistoryStep <= 0} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-colors" title="Undo"><Undo size={18} /></button>
                           <button onClick={handleRedo} disabled={editorHistoryStep >= editorHistory.length - 1} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-colors" title="Redo"><Redo size={18} /></button>
                       </div>
                   </div>
                   
                   <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto flex-1 justify-end">
                        <div className="flex items-center bg-black/30 rounded-xl p-1 border border-white/5">
                           <button 
                             onClick={() => setEditorTool('brush')}
                             className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${editorTool === 'brush' ? `bg-${activeAccentColor}-600 text-white shadow-lg shadow-${activeAccentColor}-900/50` : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                           >
                               <PenTool size={16} /> Brush
                           </button>
                           <button 
                             onClick={() => setEditorTool('eraser')}
                             className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${editorTool === 'eraser' ? 'bg-slate-200 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                           >
                               <Eraser size={16} /> Eraser
                           </button>
                           <button 
                             onClick={() => setEditorTool('pan')}
                             className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${editorTool === 'pan' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                             title="Pan / Zoom"
                           >
                               <Hand size={16} /> Move
                           </button>
                       </div>
                       
                       {/* Brush Settings */}
                       <div className="flex items-center gap-4 px-3 bg-black/20 rounded-xl py-2 border border-white/5">
                           <div className="flex flex-col gap-1 w-40">
                               <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider"><span>Brush Size</span> <span>{brushSize}px</span></div>
                               <input type="range" min="5" max="150" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className={`h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-${activeAccentColor}-500`} />
                           </div>
                       </div>
                       
                       <button onClick={() => setShowEditor(false)} className="ml-6 text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0">
                           <X size={24} />
                       </button>
                   </div>
               </div>
               
               {/* Canvas Area (Fills Container) */}
               <div className="absolute inset-0 z-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-950/20 flex items-center justify-center overflow-hidden cursor-none touch-none shadow-inner"
                    onMouseDown={(e) => {
                        // Allow panning with Middle or Right click, or if tool is Pan
                        if (e.button === 2 || e.button === 1) {
                            startEditorPan(e);
                            return;
                        }
                        if (editorTool === 'pan') {
                            startEditorPan(e);
                        } else {
                            startDrawing(e);
                        }
                    }}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={handleEditorTouchStart}
                    onTouchMove={handleEditorTouchMove}
                    onTouchEnd={stopDrawing}
                    onWheel={handleEditorWheel}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ touchAction: 'none' }} 
               >
                   <div 
                        style={{ 
                            transform: `translate(${editorPan.x}px, ${editorPan.y}px) scale(${editorZoom})`,
                            cursor: editorTool === 'pan' || isEditorPanning ? 'grab' : 'none'
                        }}
                        className="relative max-w-full max-h-full flex items-center justify-center origin-center transition-transform duration-75 ease-out p-12"
                        onDragStart={(e) => e.preventDefault()}
                   >
                       {/* Wrapper ensures canvas matches image size perfectly */}
                       <div className="relative inline-flex shadow-2xl shadow-black/50 ring-1 ring-white/10 select-none">
                           {/* Base Image */}
                           <img 
                                src={attachment} 
                                className="max-w-full max-h-[85vh] object-contain pointer-events-none select-none block" 
                                alt="Edit Reference" 
                                draggable={false}
                           />
                           
                           {/* Main committed layer */}
                           <canvas 
                                ref={editorCanvasRef} 
                                className="absolute inset-0 w-full h-full touch-none"
                                style={{ opacity: 0.6 }} // Visually semi-transparent
                           />
                           
                           {/* Active stroke layer */}
                           <canvas 
                                ref={activeLayerRef}
                                className="absolute inset-0 w-full h-full touch-none pointer-events-none"
                                style={{ opacity: 0.6 }} // Visually semi-transparent
                           />
                       </div>
                   </div>

                   {/* Custom Cursor for Brush */}
                   {editorTool !== 'pan' && !isEditorPanning && createPortal(
                        <div 
                            ref={cursorRef}
                            className={`pointer-events-none fixed top-0 left-0 z-[9999] rounded-full border border-white/80 shadow-[0_0_10px_rgba(0,0,0,0.5)] bg-${activeAccentColor}-500/20 mix-blend-normal will-change-transform backdrop-blur-[1px]`}
                            style={{
                                display: showEditor && isCursorInside ? 'block' : 'none',
                            }}
                        />,
                        document.body
                   )}
               </div>
               
               {/* Editor Footer (Absolute Overlay) */}
               <div className="absolute bottom-0 left-0 right-0 z-30 px-6 py-4 border-t border-white/5 flex items-center justify-between bg-black/30 backdrop-blur-md">
                   <div className="flex items-center gap-4">
                       <div className="bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-mono border border-white/10 pointer-events-auto">
                           {Math.round(editorZoom * 100)}%
                       </div>
                       <button onClick={() => { setEditorZoom(1); setEditorPan({x:0, y:0}); }} className="bg-white/5 hover:bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-xs border border-white/10 transition-colors">Fit</button>
                       <button onClick={clearMask} className="bg-red-500/10 hover:bg-red-500/20 text-red-200 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs border border-red-500/20 transition-colors flex items-center gap-1"><Trash2 size={12}/> Clear</button>
                   </div>
                   
                   <div className="flex gap-4">
                       <button onClick={saveMask} className={`px-8 py-2.5 bg-gradient-to-r from-${activeAccentColor}-600 to-${activeAccentColor}-500 hover:to-${activeAccentColor}-400 text-white font-bold rounded-xl shadow-lg shadow-${activeAccentColor}-500/20 transition-all flex items-center gap-2 border border-white/10`}>
                           <Check size={18} strokeWidth={3} /> Apply Mask
                       </button>
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* Confirmation Modal - Z-Index 110 */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-8 max-w-sm w-full transform scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-500/10 rounded-full text-red-500"><Trash2 size={24} /></div>
              Delete {deleteStats.total} Images?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 mt-2 leading-relaxed">
              {deleteStats.favorites > 0 
                ? `${deleteStats.favorites} favorite(s) will be SAVED. Only non-favorites will be deleted.` 
                : "This action cannot be undone."}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors font-medium">Cancel</button>
              <button onClick={executeDelete} className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-600/20 transition-all">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-8 max-w-md w-full transform scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto ${scrollbarStyles}`}>
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <div className={`p-2 bg-${activeAccentColor}-100 dark:bg-${activeAccentColor}-500/10 rounded-xl text-${activeAccentColor}-600 dark:text-${activeAccentColor}-400`}>
                    <Settings size={24} />
                  </div>
                  Settings
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="space-y-8">
                <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2"><Monitor size={16} className="text-slate-400"/> Appearance</label>
                    <div className="grid grid-cols-3 gap-3 p-1.5 bg-slate-100 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5">
                        {['light', 'dark', 'system'].map(mode => (
                            <button key={mode} onClick={() => setTempTheme(mode)} className={`py-2.5 px-2 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-1.5 capitalize ${tempTheme === mode ? `bg-white dark:bg-slate-800 text-${activeAccentColor}-600 dark:text-white shadow-md ring-1 ring-black/5 dark:ring-white/10` : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'}`}>{mode === 'light' ? <Sun size={18}/> : mode === 'dark' ? <Moon size={18}/> : <Monitor size={18}/>}<span>{mode}</span></button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2"><Palette size={16} className={`text-${tempAccentColor}-500`}/> Accent Color</label>
                    <div className="grid grid-cols-6 gap-3">
                        {ACCENT_COLORS.map(color => (
                            <button key={color.id} onClick={() => setTempAccentColor(color.id)} className={`aspect-square rounded-2xl flex items-center justify-center transition-all bg-gradient-to-br ${color.gradient} shadow-lg ${color.shadow} ${tempAccentColor === color.id ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-' + color.tailwind + '-500 scale-110' : 'opacity-80 hover:opacity-100 hover:scale-105'}`}>{tempAccentColor === color.id && <Check size={18} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2"><Zap size={16} className="text-amber-500"/> Image Generation Model</label>
                    <div className="flex gap-3 p-1.5 bg-slate-100 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5">
                        <button onClick={() => setTempModelType('free')} className={`flex-1 py-4 px-3 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-1 ${tempModelType === 'free' ? `bg-white dark:bg-slate-800 text-${activeAccentColor}-600 dark:text-white shadow-md ring-1 ring-black/5 dark:ring-white/10` : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'}`}><span>Nano Banana</span><span className="text-[10px] font-normal opacity-70 tracking-wide uppercase">Standard</span></button>
                        <button onClick={() => setTempModelType('pro')} className={`flex-1 py-4 px-3 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-1 ${tempModelType === 'pro' ? `bg-white dark:bg-slate-800 text-${activeAccentColor}-600 dark:text-white shadow-md ring-1 ring-black/5 dark:ring-white/10` : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'}`}><span>Nano Banana Pro</span><span className="text-[10px] font-normal opacity-70 tracking-wide uppercase">High Quality</span></button>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-200 dark:border-white/10">
              <button onClick={() => setShowShortcuts(true)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors font-medium"><Keyboard size={16}/> Shortcuts</button>
              <div className="flex gap-3">
                <button onClick={() => setIsSettingsOpen(false)} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors font-medium">Cancel</button>
                <button onClick={saveSettings} className={`px-6 py-2.5 rounded-xl bg-gradient-to-r from-${activeAccentColor}-600 to-${activeAccentColor}-500 hover:to-${activeAccentColor}-400 text-white font-bold shadow-lg shadow-${activeAccentColor}-500/25 transition-all transform hover:scale-[1.02]`}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-full transform scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Keyboard className={`text-${activeAccentColor}-500`} size={24} /> Keyboard Shortcuts</h3>
                <button onClick={() => setShowShortcuts(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400 font-medium">Generate Image</span><div className="flex gap-1"><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-xs font-mono border border-slate-200 dark:border-white/10">Ctrl</kbd> + <kbd className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-xs font-mono border border-slate-200 dark:border-white/10">Enter</kbd></div></div>
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400 font-medium">Search Gallery</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-xs font-mono border border-slate-200 dark:border-white/10 min-w-[28px] text-center">/</kbd></div>
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400 font-medium">Delete Image</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-xs font-mono border border-slate-200 dark:border-white/10 min-w-[28px] text-center">Del</kbd></div>
                <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400 font-medium">Next/Prev Image</span><div className="flex gap-1"><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-xs font-mono border border-slate-200 dark:border-white/10">←</kbd><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-xs font-mono border border-slate-200 dark:border-white/10">→</kbd></div></div>
                 <div className="flex items-center justify-between"><span className="text-slate-600 dark:text-slate-400 font-medium">Close Modal</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-xs font-mono border border-slate-200 dark:border-white/10">Esc</kbd></div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-white/20 dark:border-white/5 shadow-sm z-40 shrink-0 sticky top-0 transition-colors duration-500">
        <div className="flex items-center gap-4">
          <div className={`p-2.5 bg-gradient-to-tr ${currentGradient} rounded-2xl shadow-lg shadow-${activeAccentColor}-500/20 ring-1 ring-white/20 transform hover:scale-105 transition-transform duration-300`}>
            <Aperture size={26} className="text-white drop-shadow-sm" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-none font-display">PixelGen</h1>
            <span className={`text-[11px] font-bold tracking-[0.2em] text-${activeAccentColor}-600 dark:text-${activeAccentColor}-400 uppercase opacity-90`}>Studio</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => setIsSettingsOpen(true)} className={`p-2.5 rounded-xl transition-all group relative border border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5`} title="Settings"><Settings size={20} className="group-hover:rotate-45 transition-transform duration-500" /></button>
            <button onClick={resetState} className={`p-2.5 text-slate-500 dark:text-slate-400 hover:text-${activeAccentColor}-600 dark:hover:text-${activeAccentColor}-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all group relative border border-transparent hover:border-slate-200 dark:hover:border-white/10`} title="New Session"><RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-700 ease-in-out" /></button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl"><History size={24} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        <main ref={mainScrollRef} className={`flex-1 flex flex-col h-full relative overflow-y-auto scrollbar-track-transparent ${scrollbarStyles}`}>
          <div className="max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col gap-8">
            
            {/* Control Panel */}
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-white/50 dark:border-white/5 rounded-3xl shadow-xl overflow-hidden shrink-0 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/50">
              <div className="p-5 md:p-6 flex flex-col gap-8">
                
                {/* 1. Input Area */}
                <div className="relative group flex flex-col gap-4">
                  <div className={`relative w-full bg-slate-50/50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-${activeAccentColor}-500/50 focus-within:border-${activeAccentColor}-500/50 shadow-inner overflow-hidden flex flex-col hover:border-slate-300 dark:hover:border-white/10`}>
                      
                      {/* Attachment Preview */}
                      {attachment && (
                          <div className="absolute top-4 left-4 z-10 animate-in fade-in slide-in-from-top-2">
                              <div className="relative group/attachment cursor-pointer" onClick={() => setShowEditor(true)} title="Click to Edit/Mask">
                                  <div className={`relative rounded-xl overflow-hidden border-2 transition-all shadow-lg ${maskAttachment ? `border-${activeAccentColor}-500 shadow-${activeAccentColor}-500/30` : 'border-white dark:border-slate-600 hover:border-slate-300'}`}>
                                     <img src={attachment} alt="Reference" className="w-16 h-16 object-cover" />
                                     {maskAttachment && (
                                         <div className={`absolute bottom-0 inset-x-0 h-1.5 bg-${activeAccentColor}-500`}></div>
                                     )}
                                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/attachment:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[1px]">
                                         <PenTool size={12} className="text-white" />
                                     </div>
                                  </div>
                                  {maskAttachment && <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white bg-${activeAccentColor}-500 px-2 py-0.5 rounded-full whitespace-nowrap shadow-md`}>Mask Active</span>}
                                  <button onClick={removeAttachment} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover/attachment:opacity-100 transition-all z-20 hover:scale-110 hover:bg-red-600">
                                      <X size={10} strokeWidth={3} />
                                  </button>
                              </div>
                          </div>
                      )}

                      <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your imagination... (e.g., 'A cyberpunk city in the rain')"
                        className={`w-full bg-transparent border-none focus:ring-0 p-5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none resize-none h-32 text-lg leading-relaxed ${attachment ? 'pl-24' : ''} ${scrollbarStyles}`}
                        onKeyDown={(e) => { if (e.ctrlKey && !e.metaKey && e.key === 'Enter') { e.preventDefault(); handleGenerate(); }}}
                      />
                      
                      <div className="flex flex-wrap justify-between px-3 py-2 w-full items-end gap-2 bg-gradient-to-t from-slate-100/50 to-transparent dark:from-black/20">
                         
                        <div className="flex flex-wrap items-center gap-2">
                             <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" ref={fileInputRef} />
                             <button onClick={() => fileInputRef.current?.click()} className={`p-2.5 rounded-xl transition-all ${attachment ? `text-${activeAccentColor}-500 bg-${activeAccentColor}-50 dark:bg-${activeAccentColor}-500/10` : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-white/5'}`} title="Upload Reference Image"><ImagePlus size={20} /></button>
                             <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block"></div>
                             <button onClick={() => setShowLibrary(!showLibrary)} className={`p-2.5 rounded-xl transition-all ${showLibrary ? `text-${activeAccentColor}-500 bg-${activeAccentColor}-50 dark:bg-${activeAccentColor}-500/10` : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-white/5'}`} title="Prompt Library"><BookOpen size={20} /></button>
                             <button onClick={() => setShowAdvanced(!showAdvanced)} className={`p-2.5 rounded-xl transition-all ${showAdvanced ? `text-${activeAccentColor}-500 bg-${activeAccentColor}-50 dark:bg-${activeAccentColor}-500/10` : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-white/5'}`} title="Advanced Settings"><Sliders size={20} /></button>
                        </div>

                        <div className="flex gap-1.5 bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-xl p-1.5 border border-slate-200 dark:border-white/5 shadow-sm ml-auto">
                             <button onClick={() => copyToClipboard(prompt, -1)} disabled={!prompt} className={`p-2 text-slate-400 hover:text-${activeAccentColor}-500 hover:bg-${activeAccentColor}-50 dark:hover:bg-white/5 rounded-lg transition-colors`} title="Copy"><Copy size={18} /></button>
                             <div className="w-px bg-slate-200 dark:bg-white/10 my-1 mx-1"></div>
                             <button onClick={handleRefinePrompt} disabled={!prompt || textLoading} className={`p-2 rounded-lg transition-colors ${!prompt ? 'text-slate-300 dark:text-slate-700' : `text-${activeAccentColor}-500 hover:bg-${activeAccentColor}-50 dark:hover:bg-white/5`}`} title="Refine">{textLoading ? <Loader2 size={18} className="animate-spin" /> : <Stars size={18} />}</button>
                            <button onClick={handleSurpriseMe} disabled={textLoading} className={`p-2 text-${activeAccentColor}-500 hover:bg-${activeAccentColor}-50 dark:hover:bg-white/5 rounded-lg transition-colors`} title="Surprise Me">{textLoading ? <Loader2 size={18} className="animate-spin" /> : <Dice5 size={18} />}</button>
                            <div className="w-px bg-slate-200 dark:bg-white/10 my-1 mx-1"></div>
                             <button onClick={clearPrompt} disabled={!prompt && !attachment} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30" title="Clear Text"><Trash2 size={18} /></button>
                        </div>
                      </div>
                  </div>
                  
                  {/* Library */}
                  {showLibrary && (
                      <div className="bg-slate-50 dark:bg-black/20 rounded-2xl p-4 border border-slate-200 dark:border-white/5 animate-in slide-in-from-top-2 fade-in duration-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                          {Object.entries(PROMPT_LIBRARY).map(([category, items]) => (
                              <div key={category} className="space-y-2">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                      {category === 'Lighting' && <Lightbulb size={12}/>}
                                      {category === 'Camera' && <Camera size={12}/>}
                                      {category === 'Art Style' && <Palette size={12}/>}
                                      {category === 'Vibe' && <Focus size={12}/>}
                                      {category}
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5">
                                      {items.map(item => (
                                          <button 
                                            key={item} 
                                            onClick={() => setPrompt(prev => prev + (prev.trim() ? ', ' : '') + item)}
                                            className="px-2.5 py-1 text-xs bg-white dark:bg-black/40 hover:bg-white/80 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                                          >
                                              {item}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}

                  {/* Advanced Settings */}
                  {showAdvanced && (
                    <div className="bg-slate-50 dark:bg-black/20 rounded-2xl p-4 border border-slate-200 dark:border-white/5 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="flex gap-4">
                             <div className="flex-1 space-y-2">
                                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Ban size={12}/> Negative Prompt</label>
                                 <input type="text" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="Things to exclude..." className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-${activeAccentColor}-500/20 outline-none transition-all" />
                             </div>
                             <div className="w-1/3 sm:w-1/4 space-y-2">
                                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Hash size={12}/> Seed</label>
                                 <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Random" className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-${activeAccentColor}-500/20 outline-none transition-all" />
                             </div>
                         </div>
                    </div>
                  )}
                </div>

                {/* 2. Style Grid */}
                <div>
                   <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2"><LayoutGrid size={14} /> Style Presets</span>
                      <span className={`text-xs font-bold tracking-wide text-${activeAccentColor}-600 dark:text-${activeAccentColor}-400 bg-${activeAccentColor}-50 dark:bg-${activeAccentColor}-500/10 px-3 py-1 rounded-full border border-${activeAccentColor}-100 dark:border-${activeAccentColor}-500/20`}>{selectedStyle.label}</span>
                    </div>
                    <div className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 ${scrollbarStyles}`}>
                      {STYLES.map(style => (
                        <button key={style.id} onClick={() => setSelectedStyle(style)} className={`relative aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden group transition-all duration-300 ${selectedStyle.id === style.id ? `ring-2 ring-${activeAccentColor}-500 shadow-xl shadow-${activeAccentColor}-500/20 scale-[1.03] z-10` : 'ring-1 ring-slate-200 dark:ring-white/10 hover:scale-[1.03] hover:ring-white/30 grayscale hover:grayscale-0'}`}>
                          <img src={style.preview} loading="eager" alt={style.label} onError={(e: any) => { e.target.style.display = 'none'; e.target.parentElement.style.backgroundColor = '#f1f5f9'; e.target.parentElement.classList.add('dark:bg-slate-800'); }} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                          <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent ${selectedStyle.id === style.id ? 'opacity-80' : 'opacity-60 group-hover:opacity-80'}`} />
                          {selectedStyle.id === style.id && (<div className={`absolute top-2 right-2 bg-${activeAccentColor}-500 text-white rounded-full p-1.5 shadow-lg`}><Sparkles size={10} fill="currentColor" /></div>)}
                          <span className={`absolute bottom-3 left-0 right-0 text-center text-[11px] font-bold text-white px-2 truncate drop-shadow-md ${selectedStyle.id === style.id ? 'translate-y-0' : 'translate-y-1 group-hover:translate-y-0'} transition-transform duration-300`}>{style.label}</span>
                        </button>
                      ))}
                    </div>
                </div>

                {/* 3. Action Bar */}
                <div className="flex flex-col lg:flex-row gap-5 items-center justify-between bg-slate-50/80 dark:bg-black/40 p-2.5 rounded-2xl border border-slate-200 dark:border-white/5 relative z-30 backdrop-blur-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 w-full lg:w-auto">
                        <div className="flex items-center justify-between sm:justify-start gap-4 px-4 py-2 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm w-full sm:w-auto">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2"><Layers size={16} /><span className="inline">Count</span></span>
                            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg ml-auto sm:ml-0">
                                {[1, 2, 3, 4].map(num => (
                                    <button key={num} onClick={() => setBatchSize(num)} className={`w-8 h-8 rounded-md text-sm font-bold transition-all ${batchSize === num ? `bg-${activeAccentColor}-600 text-white shadow-lg shadow-${activeAccentColor}-500/30` : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10'}`}>{num}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-start gap-4 px-4 py-2 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm w-full sm:w-auto">
                             <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2"><Ratio size={16} /><span className="inline">Ratio</span></span>
                            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg ml-auto sm:ml-0">
                                {ASPECT_RATIOS.map((ratio) => (
                                    <button key={ratio.id} onClick={() => setAspectRatio(ratio.id)} title={ratio.label} className={`w-9 h-8 rounded-md text-sm font-bold transition-all flex items-center justify-center ${aspectRatio === ratio.id ? `bg-${activeAccentColor}-600 text-white shadow-lg shadow-${activeAccentColor}-500/30` : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10'}`}><ratio.icon size={16} /></button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button onClick={handleGenerate} disabled={loading || !prompt.trim()} title={!prompt.trim() ? "Enter a prompt to start" : ""} className={`h-14 px-10 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-xl w-full lg:w-auto ${loading || !prompt.trim() ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none' : `bg-gradient-to-r ${currentGradient} bg-[length:200%_auto] hover:bg-right transition-[background-position] duration-500 shadow-${activeAccentColor}-500/30 active:scale-[0.98] ring-1 ring-white/20`}`}>
                      {loading ? <><Loader2 className="animate-spin" size={20} />{batchSize > 1 ? `Generating ${batchSize}...` : 'Generating...'}</> : <><Sparkles size={20} className={prompt.trim() ? "animate-pulse" : ""} />{!prompt.trim() ? "Enter Prompt" : `Generate ${batchSize > 1 ? `${batchSize} Images` : 'Image'}`}</>}
                    </button>
                </div>
              </div>
            </div>

            {/* Display Area */}
            <div ref={displayAreaRef} className={`flex-1 min-h-[500px] flex items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/10 relative group overflow-hidden transition-all duration-500 ${!currentImage ? 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm' : 'bg-transparent border-transparent'}`}>
              {currentImage ? (
                currentImage.status === 'success' ? (
                  <div className={`relative w-full h-full flex flex-col items-center justify-center p-4 ${currentImage.isNew ? 'magical-reveal' : 'animate-in fade-in zoom-in duration-500'}`}>
                    <div className="relative max-w-full max-h-[60vh] md:max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 group-hover:ring-white/30 transition-all cursor-zoom-in hover:scale-[1.01] duration-300" onClick={() => setIsZoomed(true)}>
                      <img src={currentImage.url} alt={currentImage.prompt} className="max-w-full max-h-[60vh] md:max-h-[70vh] object-contain bg-slate-900/50 backdrop-blur-xl"/>
                      
                      {/* Top Right Actions */}
                      <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20" onClick={(e) => e.stopPropagation()}>
                         <button onClick={() => setIsZoomed(true)} className={`p-2.5 bg-black/60 backdrop-blur-xl text-white rounded-xl hover:bg-${activeAccentColor}-600 transition-all shadow-lg border border-white/10`} title="Zoom In"><Maximize2 size={18} /></button>
                         <button onClick={() => handleDownload(currentImage.url, currentImage.id, currentImage.prompt)} className={`p-2.5 bg-black/60 backdrop-blur-xl text-white rounded-xl hover:bg-${activeAccentColor}-600 transition-all shadow-lg border border-white/10`} title="Download"><Download size={18} /></button>
                         <button onClick={() => toggleFavorite(currentImage.id)} className={`p-2.5 bg-black/60 backdrop-blur-xl rounded-xl transition-all shadow-lg border border-white/10 ${currentImage.isFavorite ? 'text-red-500 bg-white/90' : 'text-white hover:bg-red-500'}`} title="Favorite"><Heart size={18} fill={currentImage.isFavorite ? "currentColor" : "none"} /></button>
                      </div>

                      {/* Bottom Overlay (Prompt + Meta) */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl flex flex-col items-center gap-3 pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-full flex items-center justify-between gap-4 shadow-xl pointer-events-auto transform translate-y-2 transition-transform group-hover:translate-y-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-slate-200 text-sm truncate font-medium font-mono tracking-tight">"{currentImage.prompt}"</p>
                                {currentImage.negativePrompt && <p className="text-red-200/70 text-[10px] truncate font-medium font-mono tracking-tight mt-0.5">Not: {currentImage.negativePrompt}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => {e.stopPropagation(); handleRemix(currentImage)}} className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors" title="Remix This"><RefreshCw size={16}/></button>
                                <button onClick={(e) => {e.stopPropagation(); handleEditImage(currentImage)}} className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors" title="Edit Mask"><PenTool size={16}/></button>
                                <button onClick={(e) => {e.stopPropagation(); copyImageToClipboard(currentImage.url, currentImage.id)}} className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg shrink-0" title="Copy Image"><Scissors size={16}/></button>
                            </div>
                        </div>
                        
                        {/* Metadata */}
                        <div className="flex items-center justify-center gap-4 text-[11px] font-bold text-white/90 uppercase tracking-widest drop-shadow-md bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5">
                            <span className="flex items-center gap-1.5"><Sparkles size={12} className={`text-${activeAccentColor}-400`}/> {currentImage.style}</span>
                            <span className="opacity-30">|</span>
                            <span>{currentImage.model}</span>
                            <span className="opacity-30">|</span>
                            <span>{currentImage.aspectRatio}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 max-w-md animate-in zoom-in-95 duration-300">
                     <div className="w-24 h-24 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-100 dark:border-red-500/20 shadow-xl shadow-red-500/10"><AlertTriangle size={40} className="text-red-500 dark:text-red-400" /></div>
                     <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Generation Failed</h3>
                     <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed max-w-xs mx-auto">{currentImage.error || "The AI model refused to generate this request."}</p>
                     <div className="bg-slate-50 dark:bg-black/40 p-5 rounded-2xl border border-slate-200 dark:border-white/10 mb-8 text-left relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Prompt attempted</p>
                         <p className="text-sm text-slate-700 dark:text-slate-300 italic font-mono">"{currentImage.prompt}"</p>
                     </div>
                     <button onClick={() => reusePrompt(currentImage.prompt)} className={`px-8 py-3 bg-${activeAccentColor}-600 hover:bg-${activeAccentColor}-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 mx-auto shadow-xl shadow-${activeAccentColor}-600/20 transform hover:scale-105`}><RotateCcw size={18} /> Retry / Edit Prompt</button>
                  </div>
                )
              ) : (
                <div className="text-center p-8 text-slate-500 dark:text-slate-600">
                  {loading ? (
                    <div className="flex flex-col items-center gap-8 animate-pulse">
                      <div className="relative">
                          <div className={`absolute inset-0 bg-${activeAccentColor}-500 blur-2xl opacity-20 rounded-full`}></div>
                          <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800/80 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-xl relative z-10"><Loader2 size={40} className={`animate-spin text-${activeAccentColor}-500`} /></div>
                      </div>
                      <div className="space-y-3"><p className="text-2xl font-semibold text-slate-800 dark:text-slate-200">Dreaming up your visual...</p><p className="text-sm text-slate-500 font-medium">{batchSize > 1 ? `Creating ${batchSize} variations... This usually takes 10-15s.` : "Creating your image... This usually takes about 5-10 seconds."}</p></div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rotate-3 flex items-center justify-center shadow-2xl dark:shadow-black/50 border border-white/50 dark:border-white/5 group-hover:rotate-0 transition-all duration-500 backdrop-blur-sm group-hover:scale-110">
                          <ImageIcon size={56} className={`text-slate-300 dark:text-slate-600 group-hover:text-${activeAccentColor}-500 transition-colors duration-500`} />
                      </div>
                      <div>
                          <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Ready to Create</p>
                          <p className="text-sm mt-3 max-w-sm mx-auto leading-relaxed opacity-70">Enter a prompt above, try <button onClick={handleSurpriseMe} className={`text-${activeAccentColor}-500 hover:underline font-bold`}>surprise me</button>, or select a style to begin.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Sidebar / History Panel */}
        <aside className={`absolute md:relative z-50 top-0 right-0 h-full w-80 bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl border-l border-slate-200 dark:border-white/10 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
          <div className="p-5 border-b border-slate-200 dark:border-white/10 flex flex-col gap-4 shrink-0 bg-white/50 dark:bg-slate-900/50">
             {/* Sidebar Header & Search */}
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <History size={18} className={`text-${activeAccentColor}-500`} /><h2 className="font-bold text-slate-800 dark:text-slate-100">Gallery</h2><span className="text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full min-w-[20px] text-center">{history.length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className={`p-1.5 transition-all rounded-lg ${showFavoritesOnly ? 'text-red-500 bg-red-50 dark:bg-red-500/10 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5'}`} title={showFavoritesOnly ? "Show All" : "Show Favorites Only"}><Heart size={16} fill={showFavoritesOnly ? "currentColor" : "none"} /></button>
                    <button onClick={() => setIsSelectionMode(!isSelectionMode)} disabled={history.length === 0} className={`p-1.5 text-slate-400 hover:text-${activeAccentColor}-500 dark:text-slate-500 dark:hover:text-${activeAccentColor}-400 disabled:opacity-30 transition-all rounded-lg ${isSelectionMode ? `text-${activeAccentColor}-600 bg-${activeAccentColor}-50 dark:bg-${activeAccentColor}-500/10 shadow-sm` : 'hover:bg-slate-100 dark:hover:bg-white/5'}`} title="Select Multiple"><CheckSquare size={16} /></button>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 ml-1"><X size={20} /></button>
                </div>
             </div>
             
             {/* Search Bar */}
             <div className="relative group mt-4">
                 <div className={`absolute inset-0 bg-${activeAccentColor}-500/20 blur opacity-0 group-focus-within:opacity-100 transition duration-500 rounded-xl`}></div>
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-${activeAccentColor}-500 transition-colors" size={14} />
                    <input 
                        id="gallery-search"
                        type="text" 
                        placeholder="Search prompts, ratio (1:1), model..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-black/40 border border-transparent dark:border-white/5 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-${activeAccentColor}-500/20 focus:border-${activeAccentColor}-500/30 transition-all outline-none"
                    />
                 </div>
             </div>
             
             {/* Selection Tools (Conditional) */}
             {isSelectionMode && (
                 <div className={`flex items-center justify-between text-xs bg-${activeAccentColor}-50 dark:bg-${activeAccentColor}-500/10 p-3 rounded-xl border border-${activeAccentColor}-100 dark:border-${activeAccentColor}-500/20 animate-in slide-in-from-top-2 mt-4`}>
                    <button onClick={toggleSelectAll} className={`flex items-center gap-2 text-${activeAccentColor}-700 dark:text-${activeAccentColor}-300 font-bold hover:underline`}>{isAllSelected ? <CheckSquare size={14} /> : <Square size={14} />} Select All</button>
                    <div className="flex gap-2">
                        <button onClick={batchToggleFavorite} disabled={selectedIds.size === 0} className="p-1.5 bg-white dark:bg-black/20 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 disabled:opacity-40 transition-colors border border-transparent hover:border-red-200" title="Favorite"><Heart size={14} /></button>
                        <button onClick={initiateDelete} disabled={selectedIds.size === 0} className="p-1.5 bg-white dark:bg-black/20 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 transition-colors border border-transparent hover:border-slate-300" title="Delete"><Trash2 size={14} /></button>
                    </div>
                 </div>
             )}
          </div>

          <div className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-track-transparent ${scrollbarStyles}`}>
            {displayedHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-slate-400 dark:text-slate-600 animate-in fade-in duration-500">
                <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-white/5 mb-4 flex items-center justify-center border border-slate-100 dark:border-white/5">
                    {showFavoritesOnly ? <Heart size={32} className="opacity-40" /> : <ImageIcon size={32} className="opacity-40" />}
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{searchTerm ? "No matches found" : (showFavoritesOnly ? "No favorites yet" : "Gallery is empty")}</p>
                <p className="text-xs mt-2 max-w-[200px] leading-relaxed opacity-60">
                    {searchTerm ? "Try searching for specific tags like '16:9', 'pro', or keywords." : (showFavoritesOnly ? "Heart an image to save it here." : "Start generating images to see them appear here automatically.")}
                </p>
              </div>
            ) : 
              displayedHistory.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const ratio = item.aspectRatio || '1:1';
                const ratioStyle = { aspectRatio: ratio.replace(':', '/') };

                return (
                <div 
                  key={item.id} 
                  onClick={(e) => { 
                    if (isSelectionMode) { 
                      toggleSelection(item.id, e); 
                    } else { 
                      setCurrentImage(item);
                      setIsSidebarOpen(false); // Close sidebar on selection for better mobile experience
                      // Scroll to display area
                      setTimeout(() => {
                        displayAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }
                  }}
                  style={ratioStyle}
                  className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/20 ${isSelectionMode ? (isSelected ? `border-${activeAccentColor}-500 ring-2 ring-${activeAccentColor}-500 ring-offset-2 dark:ring-offset-slate-900` : 'border-slate-200 dark:border-white/10 opacity-60 hover:opacity-100 grayscale') : (currentImage?.id === item.id ? (item.status === 'error' ? 'border-red-400 ring-2 ring-red-400/20' : `border-${activeAccentColor}-500 ring-4 ring-${activeAccentColor}-500/20 shadow-lg`) : (item.status === 'error' ? 'border-red-200 dark:border-red-900/50 hover:border-red-400' : `border-slate-200 dark:border-white/5 hover:border-${activeAccentColor}-400/50`))}`}
                >
                  <div className="w-full h-full bg-slate-100 dark:bg-slate-950 relative flex items-center justify-center">
                    {item.status === 'success' ? (
                        <>
                            <img src={item.url} alt={item.prompt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                            {!isSelectionMode && (<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4"><p className="text-xs text-white font-medium line-clamp-2 leading-relaxed">{item.prompt}</p></div>)}
                        </>
                    ) : (<div className="flex flex-col items-center justify-center p-4 text-center"><AlertCircle className="text-red-400 dark:text-red-500 mb-2" size={24} /><p className="text-[10px] text-red-400 dark:text-red-300 uppercase font-bold tracking-wider">Failed</p></div>)}
                    
                    {/* Favorite Indicator (Top Left) - Only show if success */}
                    {item.isFavorite && item.status === 'success' && (<div className="absolute top-2 left-2 bg-red-500 text-white p-1.5 rounded-full shadow-md z-10 pointer-events-none"><Heart size={10} fill="currentColor" /></div>)}
                    
                    {isSelectionMode && (<div className={`absolute inset-0 transition-colors flex items-center justify-center ${isSelected ? `bg-${activeAccentColor}-900/40 backdrop-blur-[1px]` : 'bg-transparent group-hover:bg-black/10'}`}>{isSelected && (<div className={`bg-${activeAccentColor}-500 text-white rounded-full p-2 shadow-xl transform scale-110`}><Check size={24} strokeWidth={4} /></div>)}</div>)}
                    
                    {/* Hover Actions - Only show if success */}
                    {!isSelectionMode && item.status === 'success' && (
                        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-[-10px] group-hover:translate-y-0 duration-300">
                            <button onClick={(e) => {e.stopPropagation(); handleEditImage(item)}} className={`p-1.5 rounded-lg backdrop-blur-md transition-colors shadow-sm border border-white/10 bg-black/40 text-white hover:bg-${activeAccentColor}-600`} title="Edit Mask"><PenTool size={14} /></button>
                            <button onClick={(e) => toggleFavorite(item.id, e)} className={`p-1.5 rounded-lg backdrop-blur-md transition-colors shadow-sm border border-white/10 ${item.isFavorite ? 'bg-red-500 text-white' : 'bg-black/40 text-white hover:bg-red-500'}`} title="Toggle Favorite"><Heart size={14} fill={item.isFavorite ? "currentColor" : "none"} /></button>
                        </div>
                    )}
                  </div>
                </div>
              )})
            }
          </div>
        </aside>
      </div>
    </div>
  );
}