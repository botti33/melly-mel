import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Book, 
  JournalPage, 
  PAPER_TONES 
} from './types';
import Bookshelf from './components/Bookshelf';
import JournalViewer from './components/JournalViewer';
import DualPageEditor from './components/DualPageEditor';
import { 
  getBooks, 
  saveBook, 
  deleteBook, 
  getBookById 
} from './utils/indexedDB';
import { 
  playPaperFlipSound, 
  playTearSound, 
  playStampSound, 
  setSoundEnabled, 
  isSoundEnabled 
} from './utils/audio';
import { 
  Notebook, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CheckCircle,
  FolderHeart,
  Feather
} from 'lucide-react';

export default function App() {
  // Navigation Screens: 'bookshelf' | 'viewer' | 'editor'
  const [currentScreen, setCurrentScreen] = useState<'bookshelf' | 'viewer' | 'editor'>('bookshelf');
  
  // Data State Ledger
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [activeEditorPage, setActiveEditorPage] = useState<JournalPage | null>(null);

  // App settings & Loading overlays
  const [isLoading, setIsLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [infoBanner, setInfoBanner] = useState<string | null>(null);

  // Sync databases from indexDB
  useEffect(() => {
    loadBooksData();
  }, []);

  const loadBooksData = async () => {
    try {
      setIsLoading(true);
      const list = await getBooks();
      setBooks(list);
    } catch (err) {
      console.error('Failed to load bookshelf database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setInfoBanner(msg);
    setTimeout(() => {
      setInfoBanner(null);
    }, 4500);
  };

  const toggleSound = () => {
    const nextState = !soundOn;
    setSoundOn(nextState);
    setSoundEnabled(nextState);
  };

  // Find currently open Book
  const activeBook = books.find(b => b.id === selectedBookId) || null;
  const activeBookPages = activeBook?.pages || [];

  // Book Shelf Operations
  const handleCreateBook = async (title: string, description: string, color: string, texture: string) => {
    try {
      const newBookObj: Book = {
        id: `book_${Date.now()}`,
        title,
        description,
        createdAt: Date.now(),
        lastModified: Date.now(),
        theme: {
          color,
          texture: texture as any,
          styleId: 'melly'
        },
        pages: []
      };

      await saveBook(newBookObj);
      showNotification(`"${title}" volume successfully sewn and added to your shelf!`);
      await loadBooksData();
    } catch (err) {
      console.error('Error creating book:', err);
      showNotification('Failed to bind container book.');
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      await deleteBook(bookId);
      showNotification('Book shelf portfolio deleted.');
      if (selectedBookId === bookId) {
        setSelectedBookId(null);
        setCurrentScreen('bookshelf');
      }
      await loadBooksData();
    } catch (err) {
      console.error('Error deleting book:', err);
    }
  };

  const handleOpenBook = (bookId: string) => {
    setSelectedBookId(bookId);
    setCurrentScreen('viewer');
    playPaperFlipSound();
  };

  // Page level operations within active Book
  const handleAddNewPageTrigger = () => {
    if (!selectedBookId) return;

    const freshNewPage: JournalPage = {
      id: `page_${Date.now()}`,
      bookId: selectedBookId,
      drawingDataUrl: '',
      strokeHistory: [],
      textBlocks: [
        {
          id: `blk_${Date.now()}`,
          content: '',
          font: 'handwritten',
          color: '#3E3B39',
          fontSize: 'lg'
        }
      ],
      timestamp: Date.now(),
      moodEmoji: '😊',
      paperTone: 'natural',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setSelectedPageId(null);
    setActiveEditorPage(freshNewPage);
    setCurrentScreen('editor');
    playPaperFlipSound();
  };

  const handleEditPageTrigger = (page: JournalPage) => {
    setSelectedPageId(page.id);
    setActiveEditorPage(page);
    setCurrentScreen('editor');
    playPaperFlipSound();
  };

  const handleDeletePage = async (pageId: string) => {
    if (!activeBook) return;

    try {
      const restPages = activeBookPages.filter(p => p.id !== pageId);
      const updatedBook: Book = {
        ...activeBook,
        pages: restPages,
        lastModified: Date.now()
      };

      await saveBook(updatedBook);
      showNotification('Page torn out from binding.');
      playTearSound();
      await loadBooksData();
    } catch (err) {
      console.error('Failed to tear out page:', err);
    }
  };

  const handleSavePageData = async (updatedPage: JournalPage) => {
    if (!activeBook) return;

    try {
      let nextPages = [...activeBookPages];
      const pageIndex = nextPages.findIndex(p => p.id === updatedPage.id);

      if (pageIndex >= 0) {
        nextPages[pageIndex] = updatedPage;
      } else {
        nextPages.push(updatedPage);
      }

      const updatedBookObj: Book = {
        ...activeBook,
        pages: nextPages,
        lastModified: Date.now()
      };

      await saveBook(updatedBookObj);
      showNotification(selectedPageId ? 'Reflections written to spine.' : 'New leaf added to volume binder!');
      
      await loadBooksData();
      setCurrentScreen('viewer');
    } catch (err) {
      console.error('Failed to sew page into book:', err);
      showNotification('Error writing memory to local database.');
    }
  };

  // High Fidelity jsPDF volume generator
  const handleExportFullBookPDF = async () => {
    if (!activeBook || activeBookPages.length === 0) return;
    showNotification('Sewing final page fibers. Building Land-Moleskin PDF...');

    try {
      // Landscape design layout: 1200 x 900 resolution
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1200, 900]
      });

      // 1. Title Cover Page Design
      pdf.setFillColor(activeBook.theme.color || '#5C4D42');
      pdf.rect(0, 0, 1200, 900, 'F');

      // Card emboss lines
      pdf.setDrawColor(245, 235, 220);
      pdf.setLineWidth(4);
      pdf.rect(40, 40, 1120, 820);

      pdf.setTextColor(253, 251, 247);
      pdf.setFont('serif', 'bold');
      pdf.setFontSize(54);
      pdf.text(activeBook.title, 600, 410, { align: 'center' });

      pdf.setFont('sans-serif', 'normal');
      pdf.setFontSize(20);
      pdf.setTextColor(220, 205, 190);
      pdf.text(activeBook.description || "A Private collection of quiet thoughts.", 600, 465, { align: 'center' });

      pdf.setFontSize(14);
      pdf.setTextColor(170, 155, 140);
      pdf.text(`VOLUME SECTOR OF ${activeBookPages.length} PAGES  |  BOUND ON ${new Date().toLocaleDateString()}`, 600, 520, { align: 'center' });

      // 2. Loop and print pages
      for (let i = 0; i < activeBookPages.length; i++) {
        pdf.addPage([1200, 900], 'landscape');

        const page = activeBookPages[i];
        const toneInfo = PAPER_TONES.find(t => t.id === page.paperTone) || PAPER_TONES[0];

        // Draw matching parchment tint
        pdf.setFillColor(toneInfo.value);
        pdf.rect(0, 0, 1200, 900, 'F');

        // Draw dark book spine shadow left aligned
        pdf.setFillColor(30, 25, 20);
        pdf.rect(0, 0, 8, 900, 'F');

        // Render transparent canvas drawing centered in top section page frame
        if (page.drawingDataUrl) {
          pdf.addImage(page.drawingDataUrl, 'PNG', 200, 50, 800, 600);
        }

        // Render page rich format story
        const blockHtml = page.textBlocks?.[0]?.content || '';
        const strippedStory = blockHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        if (strippedStory) {
          pdf.setTextColor(page.paperTone === 'dusk' ? 240 : 60, page.paperTone === 'dusk' ? 240 : 55, page.paperTone === 'dusk' ? 240 : 50);
          pdf.setFont('sans-serif', 'normal');
          pdf.setFontSize(22);

          const wrappedTextlines = pdf.splitTextToSize(strippedStory, 900);
          pdf.text(wrappedTextlines, 600, 715, { align: 'center' });
        }

        // Footnotes
        pdf.setTextColor(150, 140, 130);
        pdf.setFontSize(13);
        pdf.setFont('sans-serif', 'italic');
        pdf.text(`Leaf ${i + 1}  •  Stamped: ${page.moodEmoji}`, 1120, 840, { align: 'right' });
      }

      pdf.save(`volume_${activeBook.title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
      showNotification('Success! Book volume compiled and saved.');
    } catch (err) {
      console.error('Failed to compile PDF bundle:', err);
      showNotification('Book binding PDF encountered an error.');
    }
  };

  return (
    <div className="min-h-screen vintage-desk text-stone-100 flex flex-col font-sans transition-colors duration-500 selection:bg-amber-805/30 relative">
      
      {/* Physical background textures table top board */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMCA1MEwxMDAgNTBNMCAxMEwxMDAgMTBNMCA5MEwxMDAgOTAiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIwLjIiLz48L3N2Zz4=')]" />

      {/* SYSTEM CONTROLLER TITLE HEADER */}
      <header className="w-full bg-[#1A110B]/95 text-stone-200 border-b-2 border-[#8C6F4B]/50 py-4 px-6 sticky top-0 z-30 flex items-center justify-between shadow-lg select-none font-sans">
        <button
          type="button"
          onClick={() => {
            setCurrentScreen('bookshelf');
            setSelectedBookId(null);
            playPaperFlipSound();
          }}
          className="flex items-center gap-2.5 outline-none font-display font-medium text-base sm:text-lg text-[#E3C395] tracking-wider hover:text-white transition"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3D2517] to-[#5C4533] flex items-center justify-center text-amber-200 shadow-md font-bold text-base ring-1 ring-[#8C6F4B]/45">
            <Feather className="w-4 h-4 text-amber-300" />
          </div>
          <span>Enchanted Library Journal</span>
        </button>

        <div className="flex items-center gap-3">
          
          {/* Sounds toggler */}
          <button
            type="button"
            onClick={toggleSound}
            className="p-2.5 bg-[#2E1E14] hover:bg-[#3D281C] border border-[#5C4533]/60 rounded-xl transition cursor-pointer text-amber-200/80 hover:text-amber-100 flex items-center justify-center shadow-md"
            title={soundOn ? 'Mute sound synthesis' : 'Activate synthesized soundscape'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 opacity-50 text-stone-400" />}
          </button>

          {/* Quick return shelf */}
          {currentScreen !== 'bookshelf' && (
            <button
              type="button"
              onClick={() => {
                setCurrentScreen('bookshelf');
                setSelectedBookId(null);
                playPaperFlipSound();
              }}
              className="px-4 py-2 bg-[#2D1A10] hover:bg-[#3E2518] text-[#E8C28A] border border-[#5C4533]/80 text-xs font-sans font-semibold rounded-xl transition shadow-md cursor-pointer"
            >
              Bookshelf Shelf
            </button>
          )}

          {currentScreen === 'viewer' && (
            <button
              type="button"
              onClick={handleAddNewPageTrigger}
              className="px-4 py-2 bg-[#442C17] hover:bg-[#2F1F10] text-[#FAF7F0] border border-[#8C6F4B]/40 rounded-xl text-xs font-sans font-semibold flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Feather className="w-3.5 h-3.5 text-amber-200" />
              <span>Draw Story</span>
            </button>
          )}

        </div>
      </header>

      {/* THE PRIMARY MAIN STAGE */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 flex flex-col items-center justify-center relative z-10">
        
        {/* Dynamic status banner overlays */}
        {infoBanner && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-stone-900/95 text-stone-100 border border-stone-700/50 rounded-2xl px-6 py-3 shadow-xl backdrop-blur-md flex items-center gap-3 animate-fade-in animate-pulse">
            <CheckCircle className="w-4 h-4 text-amber-400" />
            <p className="font-sans text-xs font-medium tracking-wide leading-none">{infoBanner}</p>
          </div>
        )}

        {/* LOADING SCREEN */}
        {isLoading ? (
          <div className="flex flex-col gap-3.5 items-center justify-center py-24 text-stone-500">
            <Sparkles className="w-8 h-8 animate-spin text-amber-650" />
            <p className="font-serif italic text-sm font-medium">Blowing dust from wooden shelves...</p>
          </div>
        ) : (
          <div className="w-full">
            
            {/* VIEW 1: COZY PHYSICAL BOOKSHELF (Landing desk screen) */}
            {currentScreen === 'bookshelf' && (
              <Bookshelf
                books={books}
                onOpenBook={handleOpenBook}
                onCreateBook={handleCreateBook}
                onDeleteBook={handleDeleteBook}
              />
            )}

            {/* VIEW 2: BOOK PAGES BROWSER VIEW (Opening sliding leaves) */}
            {currentScreen === 'viewer' && (
              <div className="w-full flex flex-col gap-6 select-none relative">
                
                {/* Back Link to Shelf */}
                <div className="w-full text-left max-w-4xl mx-auto pb-1 mt-[-10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentScreen('bookshelf');
                      setSelectedBookId(null);
                      playPaperFlipSound();
                    }}
                    className="text-xs font-sans font-semibold text-[#8C7A6B] hover:text-[#5C4D42] flex items-center gap-1 cursor-pointer"
                  >
                    ← Leave Study & return to Bookshelf
                  </button>
                </div>

                {activeBook && (
                  <JournalViewer
                    pages={activeBookPages}
                    onClose={() => {
                      setCurrentScreen('bookshelf');
                      setSelectedBookId(null);
                      playPaperFlipSound();
                    }}
                    onDeletePage={handleDeletePage}
                    onEditPage={handleEditPageTrigger}
                    onCreateNew={handleAddNewPageTrigger}
                    onExportPDF={handleExportFullBookPDF}
                  />
                )}
              </div>
            )}

            {/* VIEW 3: SKETCHPAD DUAL COMPILER (Active drawing & edit workshop) */}
            {currentScreen === 'editor' && activeEditorPage && (
              <div className="w-full flex flex-col gap-6 animate-fade-in select-none">
                
                {/* Breadcrumb navigator top margin */}
                <div className="w-full text-left font-sans text-xs font-semibold text-stone-500 flex items-center gap-1.5">
                  <button 
                    type="button" 
                    className="hover:text-stone-800"
                    onClick={() => {
                      if (confirm('Go back to the reader view? Unsaved strokes will melt away.')) {
                        setCurrentScreen('viewer');
                        playPaperFlipSound();
                      }
                    }}
                  >
                    {activeBook?.title}
                  </button>
                  <span>/</span>
                  <span className="text-[#8C7A6B]">
                    {selectedPageId ? 'Edit Page' : 'Blank Canvas'}
                  </span>
                </div>

                <DualPageEditor
                  initialPage={activeEditorPage}
                  onSave={handleSavePageData}
                  onCancel={() => {
                    if (confirm('Are you absolute sure you want to discard your draft modifications?')) {
                      setCurrentScreen('viewer');
                      playPaperFlipSound();
                    }
                  }}
                />
              </div>
            )}

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="w-full mt-auto py-8 bg-black/35 border-t border-[#8C6F4B]/35 text-center flex flex-col items-center justify-center gap-1.5 select-none text-[#D9B780]">
        <p className="font-serif italic text-xs opacity-80">
          "A silent drawer for Mel's paper drawings, watercolor strokes, and inkwell reflections."
        </p>
        <p className="font-mono text-[9px] uppercase tracking-widest text-[#A8885B] mt-0.5">
          Offline Study Active • Hand-Sewn local ledger
        </p>
      </footer>

    </div>
  );
}
