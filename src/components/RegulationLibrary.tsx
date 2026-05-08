import { useState, useMemo } from 'react';
import { Regulation } from '../types';
import { 
  BookOpen, 
  Search, 
  Filter, 
  FileText, 
  ChevronRight, 
  Hash, 
  BarChart, 
  ExternalLink,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const SAMPLE_REGULATIONS: Regulation[] = [
  {
    id: '1',
    title: 'UU Nomor 1 Tahun 2024',
    subject: 'Perubahan Kedua atas UU ITE',
    type: 'UU',
    year: 2024,
    tags: ['Informasi Elektronik', 'Transaksi Elektronik', 'Pidana'],
    description: 'Mengatur tentang pembaruan ketentuan pidana dan perlindungan anak di ruang digital.',
    status: 'AKTIF'
  },
  {
    id: '2',
    title: 'PP Nomor 5 Tahun 2021',
    subject: 'Penyelenggaraan Perizinan Berusaha Berbasis Risiko',
    type: 'PP',
    year: 2021,
    tags: ['OSS', 'Investasi', 'Izin Usaha'],
    description: 'Implementasi dari UU Cipta Kerja terkait kemudahan berusaha bagi pelaku UMKM dan Korporasi.',
    status: 'AKTIF',
    hierarchy: 'Turunan dari UU No 11/2020 tentang Cipta Kerja'
  },
  {
    id: '3',
    title: 'Permenkominfo No 5 Tahun 2020',
    subject: 'Penyelenggara Sistem Elektronik Lingkup Privat',
    type: 'PERMEN',
    year: 2020,
    tags: ['PSE', 'Data Pribadi', 'Meta'],
    description: 'Kewajiban pendaftaran dan kepatuhan moderasi konten bagi platform digital.',
    status: 'DIUBAH',
    hierarchy: 'Telah diubah sebagian oleh Permenkominfo No 10/2021'
  },
  {
    id: '4',
    title: 'Perpres No 12 Tahun 2021',
    subject: 'Pengadaan Barang/Jasa Pemerintah',
    type: 'PERPRES',
    year: 2021,
    tags: ['Tender', 'LPSKE', 'Pemerintah'],
    description: 'Ketentuan teknis pengadaan barang dan jasa menggunakan sistem elektronik.',
    status: 'AKTIF'
  },
  {
    id: '5',
    title: 'Perda DKI Jakarta No 2 Tahun 2020',
    subject: 'Penanggulangan COVID-19',
    type: 'PERDA',
    year: 2020,
    tags: ['Kesehatan', 'Sanksi', 'DKI'],
    description: 'Dasar hukum pelaksanaan PSBB dan protokol kesehatan di wilayah Jakarta.',
    status: 'DICABUT'
  }
];

export default function RegulationLibrary() {
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<Regulation['type'] | 'ALL'>('ALL');
  const [selectedReg, setSelectedReg] = useState<Regulation | null>(null);

  const filteredRegs = useMemo(() => {
    return SAMPLE_REGULATIONS.filter(reg => {
      const matchesSearch = 
        reg.title.toLowerCase().includes(search.toLowerCase()) || 
        reg.subject.toLowerCase().includes(search.toLowerCase()) ||
        reg.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      
      const matchesType = activeType === 'ALL' || reg.type === activeType;
      
      return matchesSearch && matchesType;
    });
  }, [search, activeType]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: SAMPLE_REGULATIONS.length };
    SAMPLE_REGULATIONS.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, []);

  const types: { val: Regulation['type'] | 'ALL', label: string }[] = [
    { val: 'ALL', label: 'Semua' },
    { val: 'UU', label: 'Undang-Undang' },
    { val: 'PP', label: 'PP' },
    { val: 'PERPRES', label: 'Perpres' },
    { val: 'PERMEN', label: 'Permen' },
    { val: 'PERDA', label: 'Perda' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-800">Arsip Regulasi Nasional</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Sumber: Database Terintegrasi (Simulasi Peraturan.go.id)</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right hidden md:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Database</p>
                <p className="text-xl font-bold text-slate-900">{SAMPLE_REGULATIONS.length} Artikel</p>
             </div>
             <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                <BookOpen className="w-5 h-5 text-indigo-600" />
             </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari UU, Subjek, atau Kata Kunci..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {types.map((type) => (
               <button
                 key={type.val}
                 onClick={() => setActiveType(type.val)}
                 className={cn(
                   "whitespace-nowrap px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                   activeType === type.val 
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10" 
                    : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                 )}
               >
                 {type.label} ({categoryCounts[type.val] || 0})
               </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredRegs.length > 0 ? (
            filteredRegs.map((reg) => (
              <motion.div 
                key={reg.id}
                layoutId={reg.id}
                onClick={() => setSelectedReg(reg)}
                className={cn(
                  "p-5 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                  selectedReg?.id === reg.id 
                    ? "bg-white border-indigo-200 shadow-xl shadow-indigo-600/5 ring-1 ring-indigo-50" 
                    : "bg-white border-slate-200 hover:border-indigo-300 shadow-sm"
                )}
              >
                {selectedReg?.id === reg.id && (
                  <motion.div layoutId="active-pill" className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                )}
                
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className={cn(
                         "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                         reg.type === 'UU' ? "bg-red-50 text-red-600 border border-red-100" :
                         reg.type === 'PP' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                         "bg-slate-50 text-slate-600 border border-slate-200"
                       )}>
                         {reg.type}
                       </span>
                       <span className="text-[10px] font-bold text-slate-400">• {reg.year}</span>
                       <span className={cn(
                         "ml-auto text-[7px] font-black px-1.5 py-0.5 rounded-full border",
                         reg.status === 'AKTIF' ? "bg-green-50 text-green-600 border-green-100" :
                         reg.status === 'DIUBAH' ? "bg-amber-50 text-amber-600 border-amber-100" :
                         "bg-red-50 text-red-600 border-red-100"
                       )}>
                         {reg.status}
                       </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{reg.title}</h3>
                    <p className="text-xs font-semibold text-slate-500 leading-snug">{reg.subject}</p>
                    
                    {reg.hierarchy && (
                      <p className="mt-2 text-[9px] font-bold text-indigo-400 uppercase tracking-tighter flex items-center gap-1">
                        <Filter className="w-2.5 h-2.5" /> {reg.hierarchy}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-1.5 mt-4">
                       {reg.tags.map(tag => (
                         <span key={tag} className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">#{tag}</span>
                       ))}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                     <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 grayscale py-12">
               <Search className="w-12 h-12 mb-4" />
               <p className="text-sm font-black uppercase tracking-widest">Tidak menemukan regulasi</p>
               <p className="text-xs uppercase tracking-tighter mt-1">Coba kata kunci lain atau kategori yang berbeda</p>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="hidden lg:block w-96 border-l border-slate-200 bg-white shadow-2xl p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {selectedReg ? (
              <motion.div 
                key={selectedReg.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{selectedReg.type} Explorer</span>
                   </div>
                   <h2 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tighter">{selectedReg.title}</h2>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 italic text-xs leading-relaxed text-slate-600">
                  "{selectedReg.description}"
                </div>

                <div className="space-y-6">
                   <section>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                         <BarChart className="w-3 h-3" /> Statistik & Status
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Sitasi</p>
                            <p className="text-xl font-bold text-indigo-900">420</p>
                         </div>
                         <div className={cn(
                           "p-4 rounded-xl border",
                           selectedReg.status === 'AKTIF' ? "bg-emerald-50/50 border-emerald-100" :
                           selectedReg.status === 'DIUBAH' ? "bg-amber-50/50 border-amber-100" :
                           "bg-red-50/50 border-red-100"
                         )}>
                            <p className={cn(
                              "text-[10px] font-black uppercase tracking-widest mb-1",
                              selectedReg.status === 'AKTIF' ? "text-emerald-400" :
                              selectedReg.status === 'DIUBAH' ? "text-amber-400" :
                              "text-red-400"
                            )}>Status</p>
                            <p className={cn(
                              "text-sm font-black",
                              selectedReg.status === 'AKTIF' ? "text-emerald-900" :
                              selectedReg.status === 'DIUBAH' ? "text-amber-900" :
                              "text-red-900"
                            )}>{selectedReg.status}</p>
                         </div>
                      </div>
                   </section>

                   {selectedReg.hierarchy && (
                     <section>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                           <Filter className="w-3 h-3" /> Relasi Hirarki
                        </h4>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-700">
                           {selectedReg.hierarchy}
                        </div>
                     </section>
                   )}

                   <section>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                         <Hash className="w-3 h-3" /> Indeks Terkait
                      </h4>
                      <div className="flex flex-wrap gap-2">
                         {selectedReg.tags.map(tag => (
                           <div key={tag} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase">
                              {tag}
                           </div>
                         ))}
                      </div>
                   </section>

                   <div className="pt-8 space-y-3">
                      <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
                         <ExternalLink className="w-4 h-4" /> Buka Full-Text
                      </button>
                      <button className="w-full bg-white text-slate-900 border border-slate-200 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:border-slate-300 transition-all">
                         Bandingkan Regulasi
                      </button>
                   </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <ArrowUpDown className="w-8 h-8 text-slate-400" />
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest leading-loose">Pilih regulasi untuk<br/>melihat pratinjau intelijen</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
