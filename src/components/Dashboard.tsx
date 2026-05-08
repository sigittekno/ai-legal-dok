import { useState, useEffect, useRef } from 'react';
import { User, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { DocumentData, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firebaseUtils';
import DocumentManager from './DocumentManager';
import ChatPanel from './ChatPanel';
import DocumentPreview from './DocumentPreview';
import ComparisonTool from './ComparisonTool';
import AuditLogViewer from './AuditLogViewer';
import RegulationLibrary from './RegulationLibrary';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Scale, ChevronRight, FileText, Activity, Layers, Search, ShieldCheck, BookOpen, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'compare' | 'audit' | 'versions'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'documents' | 'regulations'>('documents');

  useEffect(() => {
    const q = query(
      collection(db, 'documents'),
      where('ownerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DocumentData));
      setDocuments(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'documents');
    });

    return () => unsubscribe();
  }, [user.uid]);

  const selectedDoc = documents.find(d => d.id === selectedDocId) || null;

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectDoc = (id: string) => {
    setSelectedDocId(id);
    setCurrentView('documents');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f0f4f8] font-sans selection:bg-gold-500/30">
      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-40 shrink-0 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl flex items-center justify-center shadow-lg border border-white/10 ring-1 ring-blue-500/20">
            <Scale className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col -gap-1">
            <h1 className="text-xl font-black tracking-tighter text-white cursor-pointer flex items-center gap-2" onClick={() => { setCurrentView('documents'); setSelectedDocId(null); }}>
              LexAI<span className="text-gold-500 italic drop-shadow-sm font-serif">Pro</span>
            </h1>
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Arsip Nasional & Intelijen Hukum</span>
          </div>
          
          <div className="ml-10 flex items-center bg-slate-800/50 backdrop-blur-md rounded-xl px-4 py-2 w-[400px] border border-white/5 shadow-inner group focus-within:ring-2 focus-within:ring-gold-500/20 transition-all">
            <Search className="w-4 h-4 text-slate-500 group-focus-within:text-gold-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cari dalam basis data hukum..." 
              className="bg-transparent border-none text-xs font-bold focus:ring-0 ml-3 w-full text-slate-200 placeholder:text-slate-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <DocumentManager user={user} onDocSelected={handleSelectDoc} compact />
          
          <div className="flex items-center gap-3 border-l border-slate-700 pl-6 group">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Authenticated</span>
              <span className="text-xs font-bold text-white truncate max-w-[120px]">{user.displayName || 'Utusan Negara'}</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-600 border border-white/10 flex items-center justify-center text-xs font-black text-slate-100 shadow-md">
               {user.displayName?.[0] || 'U'}
            </div>
            
            <button 
              onClick={() => signOut(auth)}
              className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-500 border border-transparent hover:border-red-500/20 rounded-xl transition-all"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Icon Sidebar */}
        <aside className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-8 gap-10 shrink-0 z-30">
          <button 
            onClick={() => { setSidebarOpen(!sidebarOpen); setCurrentView('documents'); }}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              (sidebarOpen && currentView === 'documents') 
                ? "bg-blue-600/10 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)] border border-blue-500/20" 
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            )}
            title="Dokumentasi"
          >
            <Layers className="w-6 h-6" />
            {(sidebarOpen && currentView === 'documents') && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_#2563eb]" />}
          </button>
          
          <button
            onClick={() => setCurrentView('regulations')}
            className={cn(
              "p-3 rounded-2xl transition-all relative group",
              currentView === 'regulations' 
                ? "bg-amber-600/10 text-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.2)] border border-amber-500/20" 
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            )}
            title="Arsip Regulasi"
          >
            <BookOpen className="w-6 h-6" />
            {currentView === 'regulations' && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-amber-500 rounded-r-full shadow-[0_0_10px_#b45309]" />}
          </button>

          <div className="text-slate-600 hover:text-slate-400 cursor-pointer p-3 transition-colors">
            <Activity className="w-6 h-6" />
          </div>
          
          <div className="text-slate-600 hover:text-slate-400 cursor-pointer p-3 transition-colors">
            <FileText className="w-6 h-6" />
          </div>

          <div className="mt-auto p-3 text-slate-700">
             <Scale className="w-6 h-6" />
          </div>
        </aside>

        {/* Document List Sidebar (Collapsible) */}
        <AnimatePresence initial={false}>
          {sidebarOpen && currentView === 'documents' && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-white border-r border-slate-200 flex flex-col overflow-hidden shrink-0 shadow-lg"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm">
                 <div className="flex items-center justify-between mb-1">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Repositori Dokumen</h2>
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{filteredDocuments.length} Arsip</span>
                 </div>
                 <p className="text-[10px] text-slate-500 font-medium">Manajemen Kasus & Analisis Terpusat</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredDocuments.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc.id)}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group text-left border",
                      selectedDocId === doc.id 
                        ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20" 
                        : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 text-slate-600 shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-xl transition-colors",
                      selectedDocId === doc.id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                    )}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                       <p className={cn("text-xs font-black truncate uppercase tracking-tighter", selectedDocId === doc.id ? "text-white" : "text-slate-700")}>
                         {doc.name}
                       </p>
                       <p className={cn("text-[9px] font-bold mt-0.5", selectedDocId === doc.id ? "text-slate-400" : "text-slate-400")}>
                         Updated {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'Baru saja'}
                       </p>
                    </div>
                    <ChevronRight className={cn("w-3 h-3 transition-transform", selectedDocId === doc.id ? "opacity-100 rotate-90" : "opacity-0 group-hover:opacity-40")} />
                  </button>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#f8fafc]">
          <AnimatePresence mode="wait">
            {currentView === 'regulations' ? (
              <motion.div 
                key="regulations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 overflow-hidden"
              >
                <RegulationLibrary />
              </motion.div>
            ) : !selectedDocId ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden flex items-center justify-center opacity-[0.03]">
                   <p className="text-[20vh] font-black uppercase text-slate-900 leading-none select-none">NATIONAL SECURITY DATA</p>
                </div>

                <div className="relative mb-12">
                  <div className="absolute -inset-10 bg-gold-500/10 rounded-full blur-[80px] animate-pulse" />
                  <div className="w-32 h-32 bg-slate-900 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center relative border border-white/10 ring-8 ring-slate-100/50">
                    <div className="absolute inset-0 bg-gradient-to-tr from-gold-500/10 to-transparent rounded-[2.5rem]" />
                    <Sparkles className="w-12 h-12 text-gold-500" />
                  </div>
                </div>

                <div className="relative z-10 space-y-2 mb-10">
                  <p className="text-[10px] font-black text-gold-500 uppercase tracking-[0.4em] mb-3">Verified Institutional Intelligence</p>
                  <h2 className="text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none">LEXAI COMMAND CENTER</h2>
                  <div className="flex items-center justify-center gap-4 py-4">
                    <div className="h-[2px] w-12 bg-slate-200" />
                    <div className="w-2 h-2 rounded-full border-2 border-gold-500" />
                    <div className="h-[2px] w-12 bg-slate-200" />
                  </div>
                  <p className="text-slate-500 max-w-lg mx-auto text-sm font-bold leading-relaxed uppercase tracking-tight">
                    Unggah instrumen hukum melalui gerbang aman ini untuk inisiasi protokol analisis intelijen terpadu.
                  </p>
                </div>
                
                <div className="relative z-10 w-full max-w-xl">
                  <DocumentManager user={user} onDocSelected={handleSelectDoc} />
                </div>

                <div className="mt-16 flex items-center gap-8 opacity-40 grayscale group-hover:grayscale-0 transition-all">
                   <div className="flex flex-col items-center gap-2">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security Layer</p>
                     <p className="text-xs font-bold text-slate-900">AES-256 Verified</p>
                   </div>
                   <div className="w-px h-8 bg-slate-200" />
                   <div className="flex flex-col items-center gap-2">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Processing</p>
                     <p className="text-xs font-bold text-slate-900">Neural Engine v5</p>
                   </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="editor"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Secondary Header */}
                <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg">
                          <FileText className="w-4 h-4 text-white" />
                       </div>
                       <div className="flex flex-col -gap-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Dokumen Terpilih</span>
                          <span className="text-sm font-black text-slate-900 truncate max-w-[400px] uppercase tracking-tighter">{selectedDoc?.name}</span>
                       </div>
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-2" />
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 border border-blue-100 rounded uppercase tracking-widest shadow-sm">
                       Verified Security Analysis
                    </span>
                  </div>
                  
                  <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
                      <button 
                        onClick={() => setActiveTab('chat')}
                        className={cn(
                          "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", 
                          activeTab === 'chat' 
                            ? "bg-white shadow-executive text-slate-900 ring-1 ring-slate-100" 
                            : "text-slate-400 hover:text-slate-700"
                        )}
                      >Kecerdasan</button>
                      <button 
                        onClick={() => setActiveTab('compare')}
                        className={cn(
                          "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", 
                          activeTab === 'compare' 
                            ? "bg-white shadow-executive text-slate-900 ring-1 ring-slate-100" 
                            : "text-slate-400 hover:text-slate-700"
                        )}
                      >Komparasi</button>
                      <button 
                        onClick={() => setActiveTab('audit')}
                        className={cn(
                          "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", 
                          activeTab === 'audit' 
                            ? "bg-white shadow-executive text-slate-900 ring-1 ring-slate-100" 
                            : "text-slate-400 hover:text-slate-700"
                        )}
                      >Audit Jejak</button>
                  </div>
                </div>

                {/* Content Panel */}
                <div className="flex-1 flex overflow-hidden">
                  <div className="flex-1 bg-slate-800/5 overflow-hidden flex flex-col relative">
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-20" />
                    <DocumentPreview doc={selectedDoc!} />
                  </div>

                  <aside className="w-[450px] bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.05)]">
                    {activeTab === 'chat' && <ChatPanel doc={selectedDoc!} />}
                    {activeTab === 'compare' && <ComparisonTool docA={selectedDoc!} allDocs={documents} />}
                    {activeTab === 'audit' && <AuditLogViewer docId={selectedDoc!.id} />}
                  </aside>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Footer */}
      <footer className="h-8 bg-slate-950 text-slate-500 px-6 flex items-center justify-between text-[9px] shrink-0 font-mono tracking-[0.15em] z-50 border-t border-white/5">
        <div className="flex gap-8">
          <span className="flex items-center gap-2 uppercase"><ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> SSL: RSA-4096 / AES-GCM</span>
          <span className="opacity-40 uppercase">TERMINAL: {user.uid.substring(0, 12).toUpperCase()}</span>
        </div>
        <div className="flex gap-6 items-center">
          <span className="flex items-center gap-2 uppercase">Integrity: <span className="text-emerald-500 font-black">Verified</span></span>
          <div className="h-3 w-px bg-slate-800" />
          <span className="text-blue-400 flex items-center gap-2 font-black uppercase">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" /> 
            AI Intel Engine v3.1: Active
          </span>
        </div>
      </footer>
    </div>
  );
}
