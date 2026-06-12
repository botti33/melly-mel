import React, { useState } from 'react';
import { JournalPage, PAPER_TONES } from '../types';
import { ArrowLeft, ArrowRight, BookOpen, Download, Trash2, Calendar, Sparkles, Smile, Feather, Plus } from 'lucide-react';
import { playTearSound, playPaperFlipSound } from '../utils/audio';

interface JournalViewerProps {
  pages: JournalPage[];
  onClose: () => void;
  onDeletePage: (id: string) => void;
  onEditPage: (page: JournalPage) => void;
  onCreateNew: () => void;
  onExportPDF: () => void;
}

export default function JournalViewer({
  pages,
  onClose,
  onDeletePage,
  onEditPage,
  onCreateNew,
  onExportPDF
}: JournalViewerProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isTearing, setIsTearing] = useState<string | null>(null);

  if (pages.length === 0) {
    return (
      <div className="w-full max-w-2xl px-6 py-20 bg-amber-500/[0.02] border-2 border-dashed border-stone-300 rounded-3xl flex flex-col items-center justify-center text-center gap-6 mx-auto">
        <div className="w-20 h-20 text-stone-400 rounded-full flex items-center justify-center border border-stone-200 bg-white shadow-sm">
          <BookOpen className="w-10 h-10 text-amber-800" />
        </div>
        <div>
          <h3 className="font-serif font-semibold text-lg text-stone-850">The Sketchbook is Empty</h3>
          <p className="text-sm text-stone-500/80 mt-1 max-w-sm mx-auto font-sans leading-relaxed">
            This bound vellum sketchbook is waiting. Draw and type your very first field entry to start compiling your personal journal!
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="px-6 py-3 rounded-xl border border-stone-850 bg-stone-900 hover:bg-stone-850 text-white font-medium text-sm transition-all outline-none cursor-pointer flex items-center gap-2 shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4 text-amber-200" />
          <span>Draw & Write First Leaf</span>
        </button>
      </div>
    );
  }

  const activePage = pages[currentPageIndex];
  const paperTone = PAPER_TONES.find(t => t.id === activePage.paperTone) || PAPER_TONES[0];

  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
      playPaperFlipSound();
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
      playPaperFlipSound();
    }
  };

  // Get rich block representation
  const mainTextBlock = activePage.textBlocks?.[0];
  const richContent = mainTextBlock?.content || activePage.storyText || '';
  const textFont = mainTextBlock?.font || 'handwritten';
  const textScaleClass = mainTextBlock?.fontSize === 'sm' ? 'text-xs' : mainTextBlock?.fontSize === 'base' ? 'text-sm' : mainTextBlock?.fontSize === 'xl' ? 'text-xl' : 'text-base';
  const textColor = mainTextBlock?.color || (activePage.paperTone === 'dusk' ? '#f5f5f4' : '#3E3B39');

  // PNG "Tear out page" download pipeline
  const handleTearPage = async (page: JournalPage) => {
    setIsTearing(page.id);
    playTearSound();

    setTimeout(() => {
      try {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 1800;
        exportCanvas.height = 1450;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return;

        // Draw physical paper tint
        ctx.fillStyle = paperTone.value;
        ctx.fillRect(0, 0, 1800, 1450);

        // Grid lines overlay
        ctx.fillStyle = 'rgba(0,0,0,0.015)';
        for (let i = 0; i < 1800; i += 3) {
          for (let j = 0; j < 1450; j += 3) {
             if (Math.random() > 0.5) ctx.fillRect(i, j, 1.5, 1.5);
          }
        }

        // Draw illustration artwork centered
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.onload = () => {
          ctx.drawImage(img, 150, 80, 1500, 1125);

          // Stories below drawing
          const strippedText = richContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          if (strippedText) {
            ctx.font = 'normal 32px sans-serif';
            ctx.fillStyle = page.paperTone === 'dusk' ? '#f5f5f4' : '#3E3B39';
            ctx.textAlign = 'center';

            const words = strippedText.split(' ');
            let currentLine = '';
            let lines = [];
            const maxWidth = 1400;

            for (let n = 0; n < words.length; n++) {
              let testLine = currentLine + words[n] + ' ';
              let metrics = ctx.measureText(testLine);
              if (metrics.width > maxWidth && n > 0) {
                lines.push(currentLine);
                currentLine = words[n] + ' ';
              } else {
                currentLine = testLine;
              }
            }
            lines.push(currentLine);

            let textY = 1250;
            lines.forEach((line) => {
              ctx.fillText(line.trim(), 900, textY);
              textY += 46;
            });
          }

          // Trigger download
          const url = exportCanvas.toDataURL('image/png');
          const element = document.createElement('a');
          const numStr = (currentPageIndex + 1).toString().padStart(3, '0');
          element.href = url;
          element.download = `enchanted_journal_page_${numStr}.png`;
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
          setIsTearing(null);
        };
        img.src = page.drawingDataUrl;

      } catch (err) {
        console.error('Failed to tear out page image', err);
        setIsTearing(null);
      }
    }, 450);
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 relative select-none animate-fade-in px-2 sm:px-0">
      
      {/* 1. Restructured Action Bar: Mobile friendly grid wrapping */}
      <div className="w-full bg-[#2F2118]/90 border border-[#8C6F4B]/40 rounded-2xl p-4 sm:px-6 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="p-2.5 bg-[#4A3223] border border-[#8C6F4B]/30 rounded-xl text-amber-200 shadow-inner">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-serif font-bold text-[#F4EDD8]">Chronology Viewer</h4>
            <p className="text-[10px] font-mono text-[#E3C395] uppercase tracking-widest leading-none mt-1">
              Leaf: {currentPageIndex + 1} of {pages.length}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Create Page Button */}
          <button
            type="button"
            onClick={onCreateNew}
            className="flex-1 sm:flex-initial px-4 py-2 aged-brass-btn text-xs font-sans font-semibold flex items-center justify-center gap-2 shadow-md transition cursor-pointer min-h-[40px] rounded-xl"
          >
            <Plus className="w-3.5 h-3.5 text-amber-200" />
            <span>Add New Leaf</span>
          </button>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={onExportPDF}
            className="flex-1 sm:flex-initial px-4 py-2 bookcloth-btn rounded-xl text-xs font-sans font-semibold flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] border border-[#5C473C]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sew PDF Booklet</span>
          </button>

          {/* Close back to shelf */}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bookcloth-btn rounded-xl text-xs font-sans font-medium cursor-pointer min-h-[40px] border border-[#5C473C]"
          >
            Go to Shelf
          </button>
        </div>
      </div>

      {/* 2. Cozy Book Metaphor Layout */}
      <div className="w-full flex justify-center items-center gap-4 relative">
        
        {/* Left Page Turn Button (DESKTOP) */}
        <button
          type="button"
          onClick={handlePrevPage}
          disabled={currentPageIndex === 0}
          className="hidden lg:flex w-12 h-12 rounded-full aged-brass-btn shadow-lg items-center justify-center hover:scale-110 active:scale-95 disabled:pointer-events-none disabled:opacity-10 text-[#FAF7F0] transition z-10 outline-none cursor-pointer border-0"
          title="Previous Page"
        >
          <ArrowLeft className="w-5 h-5 text-amber-100" />
        </button>

        {/* The Open Sketchbook Spread */}
        <div 
          className={`flex-1 relative rounded-3xl p-4 sm:p-6 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.55)] flex flex-col md:flex-row gap-6 md:gap-10 min-h-[450px] transition duration-500 transform gold-tooled-border ${
            isTearing ? 'scale-98 rotate-1 opacity-55' : 'scale-100'
          }`}
          style={{ 
            backgroundColor: paperTone.value,
            boxShadow: `0 0 0 3px #2A1D15, 0 0 0 4px #C49A45, 0 15px 40px rgba(0,0,0,0.65), inset 0 0 60px rgba(121, 85, 45, 0.15)`
          }}
        >
          
          {/* Subtle Page Grain & Fold Texture layers */}
          <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden opacity-[0.22] mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjRkZGIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDAiIG9wYWNpdHk9Ii4wMyIvPgo8L3N2Zz4=')]" />
          
          {/* Notebook Center crease line (gives real spine fold feels!) */}
          <div className="absolute top-0 bottom-0 left-[50%] w-[1.5px] bg-gradient-to-r from-black/10 via-black/25 to-black/5 pointer-events-none hidden md:block" />
          
          {/* Left Wing Crease Shadow */}
          <div className="absolute top-0 bottom-0 right-[50%] w-8 bg-gradient-to-l from-black/[0.03] to-transparent pointer-events-none hidden md:block" />
          {/* Right Wing Crease Shadow */}
          <div className="absolute top-0 bottom-0 left-[50%] w-8 bg-gradient-to-r from-black/[0.03] to-transparent pointer-events-none hidden md:block" />

          {/* SPREAD LEFT PANEL: Visual Artwork Frame */}
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px] sm:min-h-[280px]">
            {/* Page ring holes on margin */}
            <div className="absolute left-[-16px] md:left-[-8px] top-4 bottom-4 flex flex-col justify-between w-4 pointer-events-none opacity-[0.25]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 bg-gradient-to-br from-stone-900 to-black rounded-full shadow-inner border border-[#8C6F4B]/35" />
              ))}
            </div>

            <div className="w-full relative select-none rounded-xl overflow-hidden border-2 border-[#8C6F4B]/20 shadow-md">
              <img
                src={activePage.drawingDataUrl}
                alt={`Drawing page ${currentPageIndex + 1}`}
                className="w-full h-auto aspect-[4/3] object-contain block"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* SPREAD RIGHT PANEL: Story Book details */}
          <div className={`flex-1 flex flex-col justify-between py-1 text-left ${paperTone.text}`}>
            
            {/* Top metadata row */}
            <div className="flex justify-between items-center border-b border-stone-300/30 pb-2 gap-2 mt-2 md:mt-0">
              <div className="flex items-center gap-1.5 opacity-60">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[11px] font-mono tracking-wide">
                  {new Date(activePage.timestamp).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>

              {activePage.moodEmoji && (
                <div className="flex items-center gap-1 px-2.5 py-0.5 bg-stone-950/5 rounded-full text-[10px] font-sans">
                  <Smile className="w-3 h-3 opacity-55" />
                  <span>Seal: {activePage.moodEmoji}</span>
                </div>
              )}
            </div>

            {/* Main diary story text section with full HTML Block preservation */}
            <div className="my-5 flex-1 flex flex-col justify-center relative min-h-[140px]">
              <Feather className="absolute top-1 right-2 w-8 h-8 opacity-[0.03]" />
              
              {richContent ? (
                <div 
                  className={`pl-3 border-l-2 border-stone-300/50 leading-relaxed font-normal whitespace-pre-wrap ${
                    textFont === 'serif' 
                      ? 'font-serif' 
                      : textFont === 'mono' 
                        ? 'font-mono text-xs' 
                        : textFont === 'sans'
                          ? 'font-sans'
                          : 'font-serif italic font-medium'
                  } ${textScaleClass}`}
                  style={{ color: textColor }}
                  dangerouslySetInnerHTML={{ __html: richContent }}
                />
              ) : (
                <p className="font-sans text-stone-400 text-xs leading-relaxed italic text-center">
                  (No quiet reflections written on this leaf)
                </p>
              )}
            </div>

            {/* Page single-actions footer tray */}
            <div className="border-t border-stone-300/30 pt-3 flex items-center justify-between">
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEditPage(activePage)}
                  className="px-3.5 py-1.5 aged-brass-btn rounded-xl text-xs font-sans font-semibold shadow-md cursor-pointer min-h-[36px]"
                >
                  Edit Leaf
                </button>

                <button
                  type="button"
                  onClick={() => handleTearPage(activePage)}
                  className="px-3 py-1.5 bg-[#FAF7F0] hover:bg-[#EEDFCD] border border-[#8C6F4B]/40 rounded-xl text-xs font-sans font-medium text-[#4A2F17] flex items-center gap-1.5 transition cursor-pointer min-h-[36px] shadow-sm"
                >
                  <Download className="w-3 h-3 text-[#8C6F4B]" />
                  <span>Tear Out PNG</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you absolutely sure you want to tear out and burn this leaf from your journal records?')) {
                    onDeletePage(activePage.id);
                    if (currentPageIndex > 0) {
                      setCurrentPageIndex(prev => prev - 1);
                    }
                  }
                }}
                className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50/50 rounded-xl transition cursor-pointer"
                title="Burn Leaf"
              >
                <Trash2 className="w-4 h-4" />
              </button>

            </div>

          </div>

        </div>

        {/* Right Page Turn Button (DESKTOP) */}
        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPageIndex === pages.length - 1}
          className="hidden lg:flex w-12 h-12 rounded-full aged-brass-btn shadow-lg items-center justify-center hover:scale-110 active:scale-95 disabled:pointer-events-none disabled:opacity-10 text-[#FAF7F0] transition z-10 outline-none cursor-pointer border-0"
          title="Next Page"
        >
          <ArrowRight className="w-5 h-5 text-amber-100" />
        </button>

      </div>

      {/* 3. MOBILE TURN DOCK: Centered cozy controls on touchscreens */}
      <div className="flex lg:hidden w-full max-w-sm justify-between items-center gap-4 bg-[#2F2118]/90 border border-[#8C6F4B]/40 p-2.5 rounded-2xl shadow-xl mt-1 text-white">
        <button
          type="button"
          onClick={handlePrevPage}
          disabled={currentPageIndex === 0}
          className="flex-1 px-4 py-2 rounded-xl bookcloth-btn border border-[#8C6F4B]/30 text-xs font-semibold cursor-pointer min-h-[40px] flex items-center justify-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        <span className="text-xs font-mono font-medium text-amber-200 min-w-[50px] text-center">
          {currentPageIndex + 1} / {pages.length}
        </span>

        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPageIndex === pages.length - 1}
          className="flex-1 px-4 py-2 rounded-xl bookcloth-btn border border-[#8C6F4B]/30 text-xs font-semibold cursor-pointer min-h-[40px] flex items-center justify-center gap-1"
        >
          <span>Next</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Pages indicator dots timeline track for desktop/tablet browse */}
      <div className="flex flex-wrap gap-1.5 max-w-lg justify-center pb-2 opacity-75">
        {pages.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setCurrentPageIndex(idx);
              playPaperFlipSound();
            }}
            className={`w-2.5 h-2.5 rounded-full outline-none transition-all ${
              idx === currentPageIndex
                ? 'bg-[#D4C194] ring-2 ring-amber-500 scale-125'
                : 'bg-[#5C4533] hover:bg-[#8C6F4B]'
            }`}
            title={`Go to page ${idx + 1}`}
          />
        ))}
      </div>

    </div>
  );
}
