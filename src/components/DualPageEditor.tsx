import React, { useRef, useState, useEffect } from 'react';
import { BrushType, Point, Stroke, PLAYFUL_STAMPS, StampConfig, JournalPage, TextBlock, PAPER_TONES, EMOTIONAL_MESSAGES } from '../types';
import { playPencilSound, playStampSound, playSparkleSound, playPaperFlipSound, playTearSound } from '../utils/audio';
import { 
  Sparkles, Undo2, Redo2, Trash2, Heart, Type, Pencil, PenTool, Eraser, 
  Smile, CheckCircle, FileText, ChevronRight, Brush, Bold, Italic, Underline,
  Feather, Moon, RefreshCw, Palette, Wand2, Sparkle
} from 'lucide-react';

interface DualPageEditorProps {
  initialPage: JournalPage;
  onSave: (page: JournalPage) => void;
  onCancel: () => void;
}

export default function DualPageEditor({
  initialPage,
  onSave,
  onCancel
}: DualPageEditorProps) {
  // Dual systems state machine: 'WRITE' | 'DRAW'
  const [activeMode, setActiveMode] = useState<'WRITE' | 'DRAW'>('WRITE');
  
  // Stationery and page variables
  const [paperToneId, setPaperToneId] = useState(initialPage.paperTone || 'natural');
  const [moodEmoji, setMoodEmoji] = useState(initialPage.moodEmoji || '😊');

  // Shared content state: Rich Text Delta block representation
  const [editorHtml, setEditorHtml] = useState(() => {
    if (initialPage.textBlocks && initialPage.textBlocks.length > 0) {
      return initialPage.textBlocks[0].content;
    }
    return initialPage.storyText || '';
  });
  const [textBlockFont, setTextBlockFont] = useState<'serif' | 'sans' | 'mono' | 'handwritten'>(
    initialPage.textBlocks?.[0]?.font || 'handwritten'
  );
  const [textBlockSize, setTextBlockSize] = useState<'sm' | 'base' | 'lg' | 'xl'>(
    initialPage.textBlocks?.[0]?.fontSize || 'lg'
  );
  const [textBlockColor, setTextBlockColor] = useState('#3E3B39');

  // Canvas Drawing parameters
  const [brushColor, setBrushColor] = useState('#3E3B39');
  const [brushSize, setBrushSize] = useState(12);
  const [brushOpacity, setBrushOpacity] = useState(0.8);
  const [activeBrush, setActiveBrush] = useState<BrushType>('pencil');
  const [selectedStamp, setSelectedStamp] = useState('feather');

  // Canvas rendering variables
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);

  // Undo/Redo buffers
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [canvasHistoryIndex, setCanvasHistoryIndex] = useState(-1);
  const [strokesHistory, setStrokesHistory] = useState<Stroke[]>(initialPage.strokeHistory || []);
  const [currentStrokePoints, setCurrentStrokePoints] = useState<Point[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);

  // Focus fading for canvas loop
  const [isActivelyDrawing, setIsActivelyDrawing] = useState(false);
  const drawingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Emotional voice notifications
  const [motivationalMessage, setMotivationalMessage] = useState<string | null>(null);

  // Dimensions of canvas (2x resolution for sharpness)
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 900;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawingContextRef.current = ctx;

    // Load initial drawing overlay if specified
    if (initialPage.drawingDataUrl) {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.onload = () => {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.drawImage(img, 0, 0);
        const initialSaved = canvas.toDataURL('image/png');
        setCanvasHistory([initialSaved]);
        setCanvasHistoryIndex(0);
      };
      img.src = initialPage.drawingDataUrl;
    } else {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const initialSaved = canvas.toDataURL('image/png');
      setCanvasHistory([initialSaved]);
      setCanvasHistoryIndex(0);
    }
  }, [initialPage]);

  // Push Canvas states to history queue
  const pushStateToHistory = (stateDataUrl: string) => {
    const newHistory = canvasHistory.slice(0, canvasHistoryIndex + 1);
    newHistory.push(stateDataUrl);
    
    if (newHistory.length > 20) {
      newHistory.shift();
      setCanvasHistoryIndex(newHistory.length - 1);
    } else {
      setCanvasHistoryIndex(newHistory.length - 1);
    }
    setCanvasHistory(newHistory);
  };

  const undoCanvas = () => {
    if (canvasHistoryIndex > 0) {
      const prevIndex = canvasHistoryIndex - 1;
      setCanvasHistoryIndex(prevIndex);
      restoreCanvasState(canvasHistory[prevIndex]);
    }
  };

  const redoCanvas = () => {
    if (canvasHistoryIndex < canvasHistory.length - 1) {
      const nextIndex = canvasHistoryIndex + 1;
      setCanvasHistoryIndex(nextIndex);
      restoreCanvasState(canvasHistory[nextIndex]);
    }
  };

  const restoreCanvasState = (dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingContextRef.current) return;
    const ctx = drawingContextRef.current;

    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  };

  const wipeCanvasClean = () => {
    if (confirm('Wash drawing overlay completely clean? This cannot be undone.')) {
      const canvas = canvasRef.current;
      const ctx = drawingContextRef.current;
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      setStrokesHistory([]);
      pushStateToHistory(canvas.toDataURL('image/png'));
      playPaperFlipSound();
    }
  };

  const handleModeChange = (targetMode: 'WRITE' | 'DRAW') => {
    setActiveMode(targetMode);
    playPaperFlipSound();
    
    // Select dynamic prompt hint periodically
    if (Math.random() > 0.4) {
      const randomPrompt = EMOTIONAL_MESSAGES[Math.floor(Math.random() * EMOTIONAL_MESSAGES.length)];
      setMotivationalMessage(randomPrompt);
      setTimeout(() => {
        setMotivationalMessage(null);
      }, 4500);
    }

    // Capture newest text on blur triggers
    const editor = document.getElementById('rich-editable-area');
    if (editor) {
      setEditorHtml(editor.innerHTML);
    }
  };

  // Brush styling setups
  const configureBrushContext = (
    ctx: CanvasRenderingContext2D,
    tool: BrushType,
    color: string,
    size: number,
    opacity: number
  ) => {
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size * 2.5;
    } else if (tool === 'pencil') {
      ctx.globalAlpha = opacity * 0.45;
    } else if (tool === 'pen') {
      ctx.globalAlpha = opacity;
    } else if (tool === 'watercolor') {
      ctx.globalAlpha = opacity * 0.12;
    } else if (tool === 'sparkle') {
      ctx.strokeStyle = '#FAD02C'; // Rich stellar aura outline
      ctx.globalAlpha = opacity * 0.8;
    } else if (tool === 'quill') {
      ctx.globalAlpha = opacity * 0.95;
    } else if (tool === 'marker') {
      ctx.globalAlpha = opacity * 0.35;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
    } else if (tool === 'glow') {
      ctx.globalAlpha = opacity;
    } else if (tool === 'spilled_ink') {
      ctx.globalAlpha = opacity * 0.85;
    }
  };

  // Draw stamps helper
  const drawStampOnSheet = (ctx: CanvasRenderingContext2D, x: number, y: number, stampId: string, size: number) => {
    const stamp = PLAYFUL_STAMPS.find(s => s.id === stampId) || PLAYFUL_STAMPS[0];
    ctx.save();
    ctx.globalAlpha = brushOpacity;
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.translate(x, y);
    ctx.rotate((Math.random() - 0.5) * 0.5); // nice physical variations
    
    ctx.font = `${size * 2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stamp.emoji, 0, 0);
    ctx.restore();
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5, timestamp: Date.now() };

    const rect = canvas.getBoundingClientRect();
    const scX = CANVAS_WIDTH / rect.width;
    const scY = CANVAS_HEIGHT / rect.height;

    const x = (e.clientX - rect.left) * scX;
    const y = (e.clientY - rect.top) * scY;
    
    const pressure = e.pressure !== 0 && e.pointerType === 'pen' ? e.pressure : 0.5;
    return { x, y, pressure, timestamp: Date.now() };
  };

  const handlePulseDrawingState = () => {
    setIsActivelyDrawing(true);
    if (drawingTimeoutRef.current) clearTimeout(drawingTimeoutRef.current);
    drawingTimeoutRef.current = setTimeout(() => {
      setIsActivelyDrawing(false);
    }, 1400);
  };

  useEffect(() => {
    return () => {
      if (drawingTimeoutRef.current) clearTimeout(drawingTimeoutRef.current);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isReplaying) return;
    const canvas = canvasRef.current;
    const ctx = drawingContextRef.current;
    if (!canvas || !ctx) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    handlePulseDrawingState();

    const pt = getCanvasCoords(e);
    lastPointRef.current = pt;

    if (activeBrush === 'stamp') {
      drawStampOnSheet(ctx, pt.x, pt.y, selectedStamp, brushSize);
      playStampSound();

      const singleStroke: Stroke = {
        points: [pt],
        tool: 'stamp',
        color: brushColor,
        size: brushSize,
        opacity: brushOpacity,
        stampType: selectedStamp
      };

      setStrokesHistory(prev => [...prev, singleStroke]);
      pushStateToHistory(canvas.toDataURL('image/png'));
      return;
    }

    configureBrushContext(ctx, activeBrush, brushColor, brushSize, brushOpacity);
    setCurrentStrokePoints([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isReplaying || activeBrush === 'stamp') return;
    const canvas = canvasRef.current;
    const ctx = drawingContextRef.current;
    if (!canvas || !ctx || !lastPointRef.current) return;

    handlePulseDrawingState();
    const currPt = getCanvasCoords(e);

    if (e.pointerType === 'mouse' || e.pointerType === 'touch') {
      const dx = currPt.x - lastPointRef.current.x;
      const dy = currPt.y - lastPointRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const capSpeed = Math.min(15, distance);
      currPt.pressure = Math.max(0.18, 1.25 - (capSpeed / 11));
    }

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);

    if (activeBrush === 'watercolor') {
      ctx.fillStyle = brushColor;
      const rad = brushSize * (1.5 + currPt.pressure * 1.1);
      ctx.arc(currPt.x, currPt.y, rad, 0, Math.PI * 2);
      ctx.fill();
    } else if (activeBrush === 'sparkle') {
      ctx.strokeStyle = '#FAD02C';
      ctx.lineWidth = brushSize * (0.8 + currPt.pressure * 0.5);
      ctx.quadraticCurveTo(
        lastPointRef.current.x + (currPt.x - lastPointRef.current.x) / 2,
        lastPointRef.current.y + (currPt.y - lastPointRef.current.y) / 2 + (Math.random() - 0.5) * 8,
        currPt.x,
        currPt.y
      );
      ctx.stroke();

      if (Math.random() > 0.8) {
        ctx.fillStyle = '#FFF8E7';
        ctx.font = `${Math.random() * 12 + 6}px Arial`;
        ctx.fillText('✦', currPt.x + (Math.random() - 0.5) * 20, currPt.y + (Math.random() - 0.5) * 20);
      }
    } else if (activeBrush === 'glow') {
      ctx.shadowBlur = brushSize * 1.5;
      ctx.shadowColor = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineTo(currPt.x, currPt.y);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    } else if (activeBrush === 'quill') {
      ctx.lineWidth = brushSize * (0.35 + currPt.pressure * 1.6);
      ctx.lineTo(currPt.x, currPt.y);
      ctx.stroke();
    } else if (activeBrush === 'pencil') {
      ctx.lineWidth = brushSize * 0.7;
      ctx.lineTo(currPt.x, currPt.y);
      ctx.stroke();

      // pencil tooth effect
      if (Math.random() > 0.35) {
        ctx.fillStyle = brushColor;
        ctx.fillRect(currPt.x + (Math.random() - 0.5) * 6, currPt.y + (Math.random() - 0.5) * 6, 1.2, 1.2);
      }
    } else if (activeBrush === 'spilled_ink') {
      ctx.lineWidth = brushSize * (1 + currPt.pressure * 1.5);
      ctx.lineTo(currPt.x, currPt.y);
      ctx.stroke();

      if (Math.random() > 0.88) {
        ctx.fillStyle = brushColor;
        ctx.beginPath();
        ctx.arc(currPt.x + (Math.random() - 0.5) * 35, currPt.y + (Math.random() - 0.5) * 35, Math.random() * 5 + 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.lineWidth = brushSize * (0.5 + currPt.pressure * 1.2);
      ctx.lineTo(currPt.x, currPt.y);
      ctx.stroke();
    }

    lastPointRef.current = currPt;
    setCurrentStrokePoints(prev => [...prev, currPt]);

    if (Math.random() > 0.82) {
      if (activeBrush === 'pencil') playPencilSound(currPt.pressure);
      else if (activeBrush === 'sparkle') playSparkleSound();
      else playTearSound();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isReplaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.releasePointerCapture(e.pointerId);
    isDrawingRef.current = false;

    if (currentStrokePoints.length > 0 && activeBrush !== 'stamp') {
      const finalizedStroke: Stroke = {
        points: currentStrokePoints,
        tool: activeBrush,
        color: brushColor,
        size: brushSize,
        opacity: brushOpacity
      };
      setStrokesHistory(prev => [...prev, finalizedStroke]);
    }

    setCurrentStrokePoints([]);
    lastPointRef.current = null;

    if (canvas) {
      pushStateToHistory(canvas.toDataURL('image/png'));
    }
  };

  // Memory Replay player
  const triggerStrokeReplay = () => {
    if (strokesHistory.length === 0 || isReplaying) return;
    const canvas = canvasRef.current;
    const ctx = drawingContextRef.current;
    if (!canvas || !ctx) return;

    setIsReplaying(true);
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    let strokeIdx = 0;
    let ptIdx = 0;

    const playLoop = () => {
      if (strokeIdx >= strokesHistory.length) {
        setIsReplaying(false);
        pushStateToHistory(canvas.toDataURL('image/png'));
        return;
      }

      const activeStroke = strokesHistory[strokeIdx];
      
      if (activeStroke.points.length === 0) {
        strokeIdx++;
        ptIdx = 0;
        requestAnimationFrame(playLoop);
        return;
      }

      configureBrushContext(ctx, activeStroke.tool, activeStroke.color, activeStroke.size, activeStroke.opacity);

      if (activeStroke.tool === 'stamp') {
        drawStampOnSheet(ctx, activeStroke.points[0].x, activeStroke.points[0].y, activeStroke.stampType || 'feather', activeStroke.size);
        playStampSound();
        strokeIdx++;
        ptIdx = 0;
        setTimeout(() => requestAnimationFrame(playLoop), 150);
        return;
      }

      ctx.beginPath();
      const stPts = activeStroke.points;
      
      if (ptIdx === 0) {
        ctx.moveTo(stPts[0].x, stPts[0].y);
        ptIdx = 1;
      } else {
        ctx.moveTo(stPts[ptIdx - 1].x, stPts[ptIdx - 1].y);
      }

      const stepsPerFrame = Math.max(1, Math.round(stPts.length / 14));
      for (let s = 0; s < stepsPerFrame && ptIdx < stPts.length; s++) {
        const pt = stPts[ptIdx];
        if (activeStroke.tool === 'watercolor') {
          ctx.fillStyle = activeStroke.color;
          const rad = activeStroke.size * (1.5 + pt.pressure * 1.1);
          ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
        }
        ptIdx++;
      }

      if (ptIdx >= stPts.length) {
        strokeIdx++;
        ptIdx = 0;
        if (Math.random() > 0.6) {
          playPencilSound(0.5);
        }
      }

      requestAnimationFrame(playLoop);
    };

    requestAnimationFrame(playLoop);
  };

  // Compile Page Save trigger
  const handleSaveTrigger = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const finalDrawingDataUrl = canvas.toDataURL('image/png');

    const updatedTextBlock: TextBlock = {
      id: initialPage.textBlocks?.[0]?.id || `block_${Date.now()}`,
      content: editorHtml,
      font: textBlockFont,
      color: textBlockColor,
      fontSize: textBlockSize,
    };

    const assembledPageData: JournalPage = {
      ...initialPage,
      drawingDataUrl: finalDrawingDataUrl,
      strokeHistory: strokesHistory,
      textBlocks: [updatedTextBlock],
      storyText: editorHtml.replace(/<[^>]*>/g, ''), // safe text extraction
      paperTone: paperToneId,
      moodEmoji: moodEmoji,
      updatedAt: Date.now()
    };

    onSave(assembledPageData);
  };

  const currentToneStyle = PAPER_TONES.find(t => t.id === paperToneId) || PAPER_TONES[0];

  const PALETTE_INK_COLOR_SWATCHES = [
    { value: '#3E3B39', label: 'Carbon Charcoal' },
    { value: '#8A1515', label: 'Oxblood Crimson' },
    { value: '#C68512', label: 'Saffron Wax' },
    { value: '#244D31', label: 'Forest Moss' },
    { value: '#102F4D', label: 'Prussian Indigo' },
    { value: '#4E3160', label: 'Dusk Amethyst' },
    { value: '#604131', label: 'Sepia Leather' },
    { value: '#B2627E', label: 'Dried Petal' },
  ];

  return (
    <div className="w-full flex flex-col gap-6 select-none relative animate-fade-in px-1 sm:px-0">
      
      {/* 1. Dynamic Voice Prompt Overlay */}
      {motivationalMessage && (
        <div className="absolute top-[-25px] inset-x-0 z-40 flex justify-center animate-fade-in px-4">
          <div className="bg-[#5C4D42] text-stone-100 border border-amber-300/30 font-serif italic text-xs px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 max-w-lg text-center justify-center">
            <Feather className="w-3.5 h-3.5 text-amber-200 animate-pulse shrink-0" />
            <span className="leading-tight">{motivationalMessage}</span>
          </div>
        </div>
      )}

      {/* 2. RESPONSIVE ACTION TOOLBAR - stacked on mobile, row on desktop */}
      <div className="w-full bg-[#2F2118]/90 border border-[#8C6F4B]/40 p-2.5 sm:p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        
        {/* Short, punchy segment controller triggers */}
        <div className="bg-[#160E0A]/40 p-1 rounded-xl flex items-center gap-1 border border-[#8C6F4B]/20 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleModeChange('WRITE')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg text-xs font-sans font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === 'WRITE'
                ? 'bg-gradient-to-r from-[#d8ac54] to-[#876221] text-stone-900 shadow-md font-bold'
                : 'text-[#D4C194] hover:bg-[#251A11]'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-stone-900" />
            <span>Scribe Thoughts</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('DRAW')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg text-xs font-sans font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === 'DRAW'
                ? 'bg-gradient-to-r from-[#d8ac54] to-[#876221] text-stone-900 shadow-md font-bold'
                : 'text-[#D4C194] hover:bg-[#251A11]'
            }`}
          >
            <Brush className="w-3.5 h-3.5 text-stone-900" />
            <span>Sketch Memory</span>
          </button>
        </div>

        {/* Action Controls toolbar */}
        <div className="flex items-center justify-end gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={triggerStrokeReplay}
            disabled={strokesHistory.length === 0 || isReplaying}
            className="px-3.5 py-2 bookcloth-btn rounded-xl text-xs font-sans font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all cursor-pointer min-h-[40px] flex-1 sm:flex-initial border border-[#5C473C]"
            title="Replay all recorded ink strokes"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span>Replay Ink</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bookcloth-btn rounded-xl text-xs font-sans font-medium transition min-h-[40px] flex-1 sm:flex-initial cursor-pointer border border-[#5C473C]"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSaveTrigger}
            className="px-5 py-2 aged-brass-btn text-[#FAF7F0] font-serif font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition min-h-[40px] flex-1 sm:flex-initial cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 text-amber-200" />
            <span>Sew to Spine</span>
          </button>
        </div>

      </div>

      {/* 3. CORE DESIGN WORKSPACE SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* PHYSICAL PAPER CONTAINER PANEL */}
        <div className="lg:col-span-8 flex flex-col items-center gap-4 relative min-h-[380px] sm:min-h-[440px]">
          
          <div 
            className="w-full relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl p-1 sm:p-2 overflow-hidden transition-all duration-300 flex flex-col min-h-[340px] sm:min-h-[400px] gold-tooled-border"
            style={{ 
              backgroundColor: currentToneStyle.value,
              boxShadow: `0 0 0 3px #2A1D15, 0 0 0 4px #C49A45, 0 15px 40px rgba(0,0,0,0.65), inset 0 0 60px rgba(121, 85, 45, 0.12)`
            }}
          >
            {/* Organic paper fibers background overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl opacity-[0.24] mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjRkZGIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDAiIG9wYWNpdHk9Ii4wMyIvPgo8L3N2Zz4=')]" />
            
            {/* Notebook margins fold lines */}
            <div className="absolute left-[3%] top-0 bottom-0 w-[1px] bg-red-950/5 pointer-events-none" />

            {/* A. CANVAS DRAWING LAYER */}
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`w-full h-auto aspect-[4/3] block z-10 relative touch-none select-none rounded-2xl ${
                activeMode === 'DRAW' 
                  ? 'cursor-crosshair pointer-events-auto opacity-100' 
                  : 'pointer-events-none opacity-85'
              }`}
            />

            {/* B. RICH TEXT WRITING STATION */}
            <div 
              className={`absolute inset-4 sm:inset-x-12 sm:bottom-6 sm:top-6 z-20 pointer-events-auto flex flex-col justify-center text-left ${
                activeMode === 'WRITE' 
                  ? 'ring-1 ring-amber-550/20 bg-white/55 backdrop-blur-[1px] p-3 sm:p-6 rounded-2xl shadow-inner overflow-hidden' 
                  : 'pointer-events-none opacity-30 select-none p-3 sm:p-6'
              } transition-all duration-300`}
            >
              <div
                id="rich-editable-area"
                contentEditable={activeMode === 'WRITE'}
                suppressContentEditableWarning
                onBlur={(e) => setEditorHtml(e.currentTarget.innerHTML)}
                onInput={(e) => setEditorHtml(e.currentTarget.innerHTML)}
                className={`w-full h-full min-h-[140px] focus:outline-none overflow-y-auto leading-relaxed ${
                  textBlockFont === 'serif' 
                    ? 'font-serif text-stone-900' 
                    : textBlockFont === 'mono' 
                      ? 'font-mono text-xs text-stone-700' 
                      : textBlockFont === 'sans'
                        ? 'font-sans text-stone-850'
                        : 'font-serif text-[#4A3B32] italic tracking-wide font-medium shadow-amber-300/10'
                } ${
                  textBlockSize === 'sm' ? 'text-xs' : textBlockSize === 'base' ? 'text-sm' : textBlockSize === 'lg' ? 'text-base' : 'text-lg sm:text-xl'
                }`}
                style={{
                  color: textBlockColor,
                  backgroundImage: activeMode === 'WRITE' ? 'linear-gradient(rgba(120, 110, 100, 0.05) 1px, transparent 1px)' : 'none',
                  backgroundSize: '100% 1.82em',
                  lineHeight: '1.82em',
                  minHeight: '160px'
                }}
                placeholder="Type quiet private field musings, botanical summaries, or library sketchbook footnotes here... Highlight and select typography options on the side."
              />
              
              {editorHtml.length === 0 && (
                <span className="absolute left-6 sm:left-12 top-6 sm:top-12 text-stone-400 font-serif italic text-xs pointer-events-none opacity-50">
                  Write quiet sketches of the heart...
                </span>
              )}

              {/* Character counts status line */}
              <div className="w-full flex justify-between items-center text-[9px] font-mono text-stone-400/80 border-t border-stone-200/40 pt-2 mt-2 select-none">
                <span>Vellum Page Ledger</span>
                <span>{editorHtml.replace(/<[^>]*>/g, '').length} chars registered</span>
              </div>
            </div>

            {/* Replaying overlays */}
            {isReplaying && (
              <div className="absolute inset-0 bg-stone-900/35 backdrop-blur-[1px] flex flex-col gap-2.5 items-center justify-center text-white z-30 pointer-events-auto rounded-3xl">
                <Moon className="w-8 h-8 animate-spin text-amber-200" />
                <p className="font-serif italic font-medium">Replaying strokes...</p>
              </div>
            )}

            {/* Active draw visual feedback pulse */}
            <div 
              className={`absolute inset-0 pointer-events-none bg-amber-50/[0.015] border-2 border-amber-900/5 duration-300 rounded-3xl ${
                isActivelyDrawing ? 'opacity-100' : 'opacity-0'
              }`}
            />

          </div>

          {/* Quick undo/redo controls */}
          <div className="w-full bg-[#1F140D] border border-[#8C6F4B]/35 p-2 rounded-xl flex items-center justify-between text-[#A8885B] font-mono text-[10px] tracking-wide shadow-inner">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={undoCanvas}
                disabled={canvasHistoryIndex <= 0}
                className="p-2 hover:bg-[#32231A] text-amber-200 rounded-lg disabled:opacity-20 transition cursor-pointer min-h-[36px]"
                title="Undo Brush stroke"
              >
                <Undo2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={redoCanvas}
                disabled={canvasHistoryIndex >= canvasHistory.length - 1}
                className="p-2 hover:bg-[#32231A] text-amber-200 rounded-lg disabled:opacity-20 transition cursor-pointer min-h-[36px]"
                title="Redo Brush stroke"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center font-sans font-semibold text-amber-100">
              <span>{strokesHistory.length} inks registered</span>
            </div>

            <button
              type="button"
              onClick={wipeCanvasClean}
              disabled={strokesHistory.length === 0 && !initialPage.drawingDataUrl}
              className="px-3 py-1 bg-[#4A1D1A]/50 hover:bg-[#72201D]/75 text-rose-200 border border-rose-900/40 rounded-lg flex items-center gap-1 transition-all cursor-pointer min-h-[32px]"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-300" />
              <span className="hidden sm:inline font-sans font-medium text-xs">Scrape Clean</span>
            </button>
          </div>

        </div>

        {/* RESTRUCTURED OPTIONS GRIDS - 4 columns wide, beautifully styled */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* BINDER CARD A: TYPOGRAPHY STYLE SELECTION (Only visible in WRITE mode) */}
          {activeMode === 'WRITE' && (
            <div className="bg-[#291A11] border border-[#8C6F4B]/40 rounded-2xl p-4 shadow-xl flex flex-col gap-3 w-full animate-fade-in text-left">
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#E3C395]">Footnote Typography Style</span>
              
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'serif', name: 'Roman Arch', desc: 'Classic' },
                  { id: 'handwritten', name: 'Plume Plume', desc: 'Scribbled' },
                  { id: 'sans', name: 'Clean Ink', desc: 'Modernist' },
                  { id: 'mono', name: 'Index Card', desc: 'Chronology' }
                ].map((ft) => (
                  <button
                    key={ft.id}
                    type="button"
                    onClick={() => {
                      setTextBlockFont(ft.id as any);
                      playPaperFlipSound();
                    }}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      textBlockFont === ft.id
                        ? 'border-[#C49A45] bg-[#4A3223] text-amber-100 ring-1 ring-[#C49A45] font-bold'
                        : 'border-[#8C6F4B]/30 bg-[#1F140D]/60 text-[#A8885B] hover:bg-[#251A11]'
                    }`}
                  >
                    <p className="text-xs leading-none capitalize">{ft.name}</p>
                    <span className="text-[9px] text-[#A8885B] block font-normal mt-0.5">{ft.desc}</span>
                  </button>
                ))}
              </div>

              {/* SIZES */}
              <div className="flex flex-col gap-1 border-t border-[#8C6F4B]/20 pt-2 mt-1">
                <span className="text-[9px] font-mono uppercase text-[#E3C395]">Vellum Glyph Size</span>
                <div className="flex bg-[#160E0A]/60 border border-[#8C6F4B]/25 p-0.5 rounded-xl gap-1">
                  {(['sm', 'base', 'lg', 'xl'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setTextBlockSize(sz)}
                      className={`flex-1 py-1.5 text-xs rounded-lg uppercase tracking-wider transition ${
                        textBlockSize === sz
                          ? 'bg-[#C49A45] text-stone-900 font-bold shadow-sm'
                          : 'text-[#A8885B] hover:text-[#FAF7F0]'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BINDER CARD B: CANVAS WRITING/DRAWING TOOLS (Only visible in DRAW mode) */}
          {activeMode === 'DRAW' && (
            <div className="bg-[#291A11] border border-[#8C6F4B]/40 rounded-2xl p-4 shadow-xl flex flex-col gap-3.5 w-full animate-fade-in text-left">
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#E3C395]">Quill & Brush Instruments</span>
              
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'pencil', label: 'Graphite', icon: Pencil },
                  { id: 'quill', label: 'Iron Quill', icon: Feather },
                  { id: 'pen', label: 'Fountain', icon: PenTool },
                  { id: 'watercolor', label: 'Ink Wash', icon: Palette },
                  { id: 'spilled_ink', label: 'Spill Ink', icon: Sparkles },
                  { id: 'stamp', label: 'Wax Seal', icon: Wand2 },
                  { id: 'eraser', label: 'Scraper', icon: Eraser },
                ].map((toolType) => {
                  const ToolIcon = toolType.icon;
                  return (
                    <button
                      key={toolType.id}
                      type="button"
                      onClick={() => {
                        setActiveBrush(toolType.id as BrushType);
                        playPaperFlipSound();
                        if (toolType.id === 'stamp') playStampSound();
                      }}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                        activeBrush === toolType.id
                          ? 'border-[#C49A45] bg-[#4A3223] text-amber-100 ring-1 ring-[#C49A45] font-bold'
                          : 'border-[#8C6F4B]/30 bg-[#1F140D]/60 text-[#A8885B] hover:bg-[#251A11] hover:text-[#FAF7F0]'
                      }`}
                      title={toolType.label}
                    >
                      <ToolIcon className="w-4 h-4 text-[#D4C194]" />
                      <span className="text-[9px] leading-none text-center font-sans tracking-tight truncate w-full">
                        {toolType.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* BRUSH WEIGHT ADJUSTER */}
              <div className="flex flex-col gap-1 border-t border-[#8C6F4B]/20 pt-2.5">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#E3C395]">
                  <span>Instrument Mass Size</span>
                  <span className="text-white hover:text-amber-100">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="45"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* OPACITY ADJUSTER */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#E3C395]">
                  <span>Fluid Fluidity / Opacity</span>
                  <span className="text-white hover:text-amber-100">{Math.round(brushOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={brushOpacity}
                  onChange={(e) => setBrushOpacity(parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* SECTIONS FOR STAMP DETAILS */}
              {activeBrush === 'stamp' && (
                <div className="flex flex-col gap-2 border-t border-[#8C6F4B]/20 pt-2.5 animate-fade-in">
                  <span className="text-[9px] font-mono text-amber-400 font-bold uppercase leading-none">
                    Select Wooden Seal Crest:
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    {PLAYFUL_STAMPS.map((seal) => (
                      <button
                        key={seal.id}
                        type="button"
                        onClick={() => {
                          setSelectedStamp(seal.id);
                          playStampSound();
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition text-left flex items-center gap-1.5 ${
                          selectedStamp === seal.id
                            ? 'bg-[#4A3223] border-[#C49A45] font-bold text-amber-100 shadow-md'
                            : 'bg-[#1F140D]/60 border-[#8C6F4B]/30 hover:bg-[#251A11] text-[#A8885B]'
                        }`}
                      >
                        <span className="text-xs">{seal.emoji}</span> 
                        <span className="text-[9px] font-sans truncate">{seal.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* BINDER CARD C: INKWELL PALETTE SWATCHES */}
          <div className="bg-[#291A11] border border-[#8C6F4B]/40 rounded-2xl p-4 shadow-xl flex flex-col gap-2 w-full text-left">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#E3C395]">Deep Shelf Inkwell colors</span>
            <div className="grid grid-cols-4 gap-2">
              {PALETTE_INK_COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.value}
                  type="button"
                  onClick={() => {
                    if (activeMode === 'WRITE') {
                      setTextBlockColor(swatch.value);
                    } else {
                      setBrushColor(swatch.value);
                    }
                    playStampSound();
                  }}
                  className={`h-9 rounded-xl border relative transition-transform active:scale-95 flex items-center justify-center ${
                    (activeMode === 'WRITE' ? textBlockColor === swatch.value : brushColor === swatch.value)
                      ? 'ring-2 ring-amber-300 border-[#C49A45] scale-[1.04]'
                      : 'border-black/5 hover:scale-102 font-normal'
                  }`}
                  style={{ backgroundColor: swatch.value }}
                  title={swatch.label}
                >
                  {(activeMode === 'WRITE' ? textBlockColor === swatch.value : brushColor === swatch.value) && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* BINDER CARD D: PAGE STATIONERY TONES */}
          <div className="bg-[#291A11] border border-[#8C6F4B]/40 rounded-2xl p-4 shadow-xl flex flex-col gap-2.5 w-full text-left">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#E3C395]">Porcelain & Vellum Shades</span>
            <div className="grid grid-cols-5 gap-1.5">
              {PAPER_TONES.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => {
                    setPaperToneId(tone.id);
                    playPaperFlipSound();
                  }}
                  className={`w-full aspect-square rounded-xl border flex flex-col items-center justify-end p-1 hover:scale-102 transition ${
                    paperToneId === tone.id
                      ? 'border-[#C49A45] ring-2 ring-amber-400 font-bold'
                      : 'border-[#8C6F4B]/30'
                  }`}
                  style={{ backgroundColor: tone.value }}
                  title={tone.name}
                >
                  <span className="text-[7px] font-mono capitalize tracking-tighter truncate w-full text-center font-semibold text-[#301F14]">
                    {tone.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* BINDER CARD E: SELECT MOOD BADGES */}
          <div className="bg-[#291A11] border border-[#8C6F4B]/40 rounded-2xl p-4 shadow-xl flex flex-col gap-2 w-full text-left">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#E3C395]">Chronology Mood Seal</span>
            <div className="flex justify-between gap-1 overflow-x-auto pb-1 scrollbar-thin">
              {['😊', '💭', '🌸', '🌧️', '🌊', '🧸', '🍂', '✨', '🐾'].map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setMoodEmoji(em);
                    playStampSound();
                  }}
                  className={`p-2 text-lg rounded-xl hover:scale-110 active:scale-95 transition-all outline-none ${
                    moodEmoji === em
                      ? 'bg-[#4A3223] border-[#C49A45] ring-1 ring-[#000]/15'
                      : 'hover:bg-[#3E291B] border border-transparent'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
