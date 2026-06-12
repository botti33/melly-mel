import React, { useState } from 'react';
import { Book, PAPER_TONES } from '../types';
import { BookOpen, FolderHeart, Calendar, Plus, Notebook, Feather, HelpCircle, Palette, Check, Trash2 } from 'lucide-react';
import { playStampSound, playPaperFlipSound } from '../utils/audio';

interface BookshelfProps {
  books: Book[];
  onOpenBook: (bookId: string) => void;
  onCreateBook: (title: string, description: string, color: string, texture: string) => void;
  onDeleteBook: (bookId: string) => void;
}

const PRESET_COVER_COLORS = [
  { hex: '#1C3F24', name: 'Moss Sage Velvet' },
  { hex: '#800A1D', name: 'Crimson Bookcloth' },
  { hex: '#0B2240', name: 'Prussian Blue Linen' },
  { hex: '#C2930C', name: 'Butterscotch Leather' },
  { hex: '#442C17', name: 'Worn Calfskin Brown' },
  { hex: '#161616', name: 'Dark Ebony Charcoal' },
  { hex: '#A85E6D', name: 'Dusty Rose Damask' },
  { hex: '#875128', name: 'Gilded Brass Amber' },
];

export default function Bookshelf({
  books,
  onOpenBook,
  onCreateBook,
  onDeleteBook,
}: BookshelfProps) {
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6E8875');
  const [selectedTexture, setSelectedTexture] = useState<'parchment' | 'paper' | 'inkwash' | 'leather' | 'cardboard'>('paper');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onCreateBook(
      newTitle.trim(),
      newDesc.trim() || 'A private folder of thoughts.',
      selectedColor,
      selectedTexture
    );

    // reset
    setNewTitle('');
    setNewDesc('');
    setShowCreateFolder(false);
    playStampSound();
  };

  return (
    <div className="w-full flex flex-col items-center select-none max-w-5xl mx-auto py-4">
      
      {/* 1. PHYSICAL SHELF SUMMARY BAR */}
      <div className="w-full bg-[#2F2118]/90 border border-[#8C6F4B]/40 rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between shadow-xl mb-10 gap-4">
        <div className="text-left flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4A3223] border border-[#8C6F4B]/40 flex items-center justify-center text-white shadow-inner">
            <Notebook className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-xl text-[#F4EDD8] tracking-wide text-shadow-sm">Mel's Archive Study</h2>
            <p className="text-xs font-mono text-[#D4C194] uppercase tracking-widest mt-0.5">
              Accumulated Volumes: {books.length} / Room for Infinite Reflection
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateFolder(true);
            playPaperFlipSound();
          }}
          className="px-5 py-2.5 aged-brass-btn font-medium text-sm rounded-xl flex items-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer outline-none"
        >
          <Plus className="w-4 h-4 text-amber-200" />
          <span>Bind New Sketchbook</span>
        </button>
      </div>

      {/* 2. THREE-DIMENSIONAL BOOK SHELVES */}
      <div className="w-full relative flex flex-col gap-12 pt-8 pb-16">
        
        {/* Soft magical float dust loops overlay */}
        <div className="absolute inset-x-0 -top-10 h-1 pointer-events-none text-center">
          <span className="font-serif italic text-xs text-[#DEC095] opacity-85">
            "Your silent bookshelf stands, warm in dusk light."
          </span>
        </div>

        {/* Shelving structure loop mapping books into groups of 3 for nice row distribution */}
        {books.length === 0 ? (
          <div className="w-full py-16 bg-stone-50 border border-dashed border-stone-200 rounded-3xl flex flex-col items-center text-center p-8 gap-5">
            <FolderHeart className="w-12 h-12 text-stone-300" />
            <div>
              <h4 className="text-stone-700 font-medium font-sans">No Bound Volumes Yet</h4>
              <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1">
                Mel, click the bind button above to open your very first personal journal volume.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-14">
            {/* Split books by rows of 4 */}
            {Array.from({ length: Math.ceil(books.length / 4) }).map((_, shelfIdx) => {
              const shelfBooks = books.slice(shelfIdx * 4, shelfIdx * 4 + 4);
              return (
                <div key={shelfIdx} className="relative w-full pb-4">
                  
                  {/* Spine lineup board */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4 relative z-10 min-h-[220px]">
                    {shelfBooks.map((book) => {
                      const bookPagesCount = book.pages ? book.pages.length : 0;
                      return (
                        <div key={book.id} className="flex flex-col items-center group relative">
                          
                          {/* 3D BOOK SPINE STAND */}
                          <div
                            onClick={() => {
                              onOpenBook(book.id);
                              playPaperFlipSound();
                            }}
                            className="relative w-28 h-40 sm:w-32 sm:h-44 rounded-r-xl rounded-l-xs cursor-pointer transform origin-bottom transition-all duration-300 group-hover:-translate-y-3 group-hover:rotate-1 shadow-[4px_10px_20px_rgba(0,0,0,0.15)] group-hover:shadow-[12px_24px_30px_rgba(30,20,10,0.25)] flex flex-col justify-between p-4 text-left select-none"
                            style={{
                              backgroundColor: book.theme.color,
                              borderLeft: '5px solid rgba(0,0,0,0.3)',
                              backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.15), rgba(255,255,255,0.08) 6%, transparent 25%)'
                            }}
                          >
                            {/* Inner paper trim outline mimic */}
                            <div className="absolute inset-1.5 rounded-r-lg border border-amber-400/25 pointer-events-none" />
                            
                            {/* Diagonal magical sash ribbon */}
                            <div className="absolute top-[35%] left-0 right-0 h-4 bg-gradient-to-r from-amber-500/10 via-yellow-400/20 to-amber-500/10 border-y border-amber-400/20 pointer-events-none transform -rotate-12" />

                            {/* Book text titles styled vertically/horizontally */}
                            <div className="flex flex-col gap-1 mt-1 font-serif text-amber-100 z-10">
                              <span className="text-[7.5px] font-sans tracking-widest text-amber-200/60 uppercase leading-none truncate">
                                ⚜️ {book.theme.texture} Scroll
                              </span>
                              <h3 className="text-xs sm:text-sm font-bold font-display leading-tight line-clamp-3 drop-shadow-lg tracking-wide text-amber-50">
                                {book.title}
                              </h3>
                            </div>

                            {/* Page count indicator badge */}
                            <div className="flex items-center justify-between text-[9px] text-amber-200/80 font-mono tracking-wider z-10">
                              <span>⚜️ {bookPagesCount} leaf</span>
                              <BookOpen className="w-2.5 h-2.5 text-amber-400/70" />
                            </div>

                            {/* physical tassel sticker cover overlay decoration */}
                            <div className="absolute bottom-11 right-2 text-xs opacity-65 animate-pulse z-10" title="Botanical Seal">
                              ⚜️
                            </div>
                          </div>

                          {/* DELETE DANGER BIN (Discreet toggle on hover) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Are you absolutely sure you want to incinerate "${book.title}"? All inside drawings and thoughts will be dissolved.`)) {
                                onDeleteBook(book.id);
                              }
                            }}
                            className="mt-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-rose-500/80 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-opacity duration-300 outline-none flex items-center gap-1 text-[10px] font-mono leading-none"
                            title="Deport Volume"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Incinerate</span>
                          </button>

                          {/* Timestamp tag subtitle */}
                          <p className="text-[10px] font-mono text-stone-400 mt-1">
                            {new Date(book.lastModified).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>

                        </div>
                      );
                    })}
                  </div>

                  {/* WOODEN LEDGE SHELF ACCENT (Cozy physical anchor base) */}
                  <div className="w-full h-4 bg-gradient-to-b from-[#A48269] to-[#6E5543] rounded-sm shadow-md mt-1 relative z-0 border-t border-amber-100/10">
                    {/* Shadow cast beneath ledge */}
                    <div className="absolute inset-x-0 bottom-[-10px] h-3 bg-black/10 blur-xs" />
                    {/* Plaque name holder on wood line */}
                    <div className="absolute left-[50%] -translate-x-1/2 -top-1 px-4 py-0.5 bg-[#4A392D] rounded-b border-x border-b border-stone-500/10 shadow-xs text-[8px] font-mono text-amber-200/50 uppercase tracking-widest leading-none">
                      Reflections Shelf
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 3. COZY MODAL: BIND NEW JOURNAL FOLIO */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in pointer-events-auto">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg parchment-sheet rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-left relative overflow-hidden border-2 border-[#8C6F4B]/60"
          >
            {/* Paper fiber graphic overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-25 mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjRkZGIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDAiIG9wYWNpdHk9Ii4wMyIvPgo8L3N2Zz4=')]" />

            <div className="border-b border-[#8C6F4B]/20 pb-3 z-10">
              <h3 className="font-serif font-bold text-xl text-[#3E291C] flex items-center gap-2">
                <Feather className="w-5 h-5 text-amber-750" />
                <span>Bind a New Memoir Volume</span>
              </h3>
              <p className="text-xs text-[#5C4533] mt-1 leading-relaxed">
                Configure your paper cover colors and physical stationery fiber density below.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 z-10">
              <label className="text-xs font-mono font-medium uppercase text-[#8C6F4B]">Book Spine Title</label>
              <input
                type="text"
                required
                maxLength={25}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Midnight Reflections, Summer Flora"
                className="w-full bg-[#FAF7F0]/85 border border-[#8C6F4B]/30 rounded-xl p-3 text-sm focus:outline-none focus:border-[#8C6F4B] text-[#3E291C] tracking-wide"
              />
            </div>

            <div className="flex flex-col gap-1.5 z-10">
              <label className="text-xs font-mono font-medium uppercase text-[#8C6F4B]">Quiet Sub-title description</label>
              <textarea
                maxLength={80}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g., Small quiet illustrations and ink spill feelings..."
                rows={2}
                className="w-full bg-[#FAF7F0]/85 border border-[#8C6F4B]/30 rounded-xl p-3 text-xs focus:outline-none focus:border-[#8C6F4B] text-[#3E291C] resize-none leading-relaxed"
              />
            </div>

            {/* SECTOR A: COVER COLOURE PATTE */}
            <div className="flex flex-col gap-2 z-10">
              <label className="text-xs font-mono font-medium uppercase text-[#8C6F4B] flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-stone-600" />
                <span>Cover Tone Fabric</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COVER_COLORS.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => {
                      setSelectedColor(col.hex);
                      playStampSound();
                    }}
                    className={`h-11 rounded-lg border flex items-center justify-center transition-all ${
                      selectedColor === col.hex
                        ? 'ring-2 ring-amber-500 scale-105 border-transparent'
                        : 'border-black/5 hover:scale-102'
                    }`}
                    style={{ backgroundColor: col.hex }}
                    title={col.name}
                  >
                    {selectedColor === col.hex && (
                      <Check className="w-4 h-4 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* SECTOR B: INNER PAPER STATIONERY DESIGN */}
            <div className="flex flex-col gap-1.5 z-10">
              <label className="text-xs font-mono font-medium uppercase text-[#8C6F4B]">Default Stationery Core</label>
              <div className="grid grid-cols-3 gap-2">
                {(['paper', 'parchment', 'inkwash'] as const).map((textId) => (
                  <button
                    key={textId}
                    type="button"
                    onClick={() => {
                      setSelectedTexture(textId);
                      playPaperFlipSound();
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-sans tracking-wide capitalize transition-all ${
                      selectedTexture === textId
                        ? 'border-[#8C6F4B] bg-[#E8DCC4] text-[#4A2F17] font-semibold shadow-xs'
                        : 'border-[#8C6F4B]/30 bg-white/70 hover:bg-[#FAF7F0]'
                    }`}
                  >
                    {textId === 'paper' ? 'Classic Alabaster' : textId === 'parchment' ? 'Aged Chamois' : 'Watercolor Ink'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#8C6F4B]/20 mt-2 z-10">
              <button
                type="button"
                onClick={() => {
                  setShowCreateFolder(false);
                  playPaperFlipSound();
                }}
                className="px-4 py-2 bg-[#FAF7F0] border border-[#8C6F4B]/30 hover:bg-stone-50 rounded-xl text-xs font-medium text-stone-605"
              >
                Close Shelf
              </button>
              
              <button
                type="submit"
                className="px-5 py-2 aged-brass-btn text-xs font-semibold rounded-xl shadow-md cursor-pointer"
              >
                Sew Spine Binding
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
