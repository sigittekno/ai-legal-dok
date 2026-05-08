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
import { LogOut, Scale, ChevronRight, FileText, Activity, Layers, Search, ShieldCheck, BookOpen } from 'lucide-react';
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
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-40 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg italic">L</span>
          </div>
          <h1 className="text-xl font-bold tracking-tighter text-slate-800 cursor-pointer" onClick={() => { setCurrentView('documents'); setSelectedDocId(null); }}>LexAI<span className="text-blue-600 font-normal underline decoration-2 underline-offset-4">Pro</span></h1>
          
          <div className="ml-8 flex items-center bg-slate-100 rounded-full px-4 py-1.5 w-96 border border-slate-200 shadow-inner group focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cari arsip hukum..." 
              className="bg-transparent border-none text-sm focus:ring-0 ml-2 w-full text-slate-600 placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DocumentManager user={user} onDocSelected={handleSelectDoc} compact />
          <div className="flex items-center gap-2 border-l pl-4 ml-2 border-slate-200 group relative">
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
               {user.displayName?.[0] || 'U'}
            </div>
            <span className="text-xs font-semibold text-slate-600 truncate max-w-[100px]">{user.displayName || 'Pakar Hukum'}</span>
            
            <button 
              onClick={() => signOut(auth)}
              className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-md transition-colors"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Icon Sidebar */}
        <aside className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-8 shrink-0 z-30 shadow-sm">
          <button 
            onClick={() => { setSidebarOpen(!sidebarOpen); setCurrentView('documents'); }}
            className={cn("transition-colors", (sidebarOpen && currentView === 'documents') ? "text-blue-600" : "text-slate-400 hover:text-slate-600")}
          >
            <Layers className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentView('regulations')}
            className={cn("transition-colors", currentView === 'regulations' ? "text-indigo-600" : "text-slate-400 hover:text-indigo-600")}
          >
            <BookOpen className="w-6 h-6" />
          </button>
          <div className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <Activity className="w-6 h-6" />
          </div>
          <div className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <FileText className="w-6 h-6" />
          </div>
          <div className="mt-auto text-slate-300">
             <Scale className="w-5 h-5" />
          </div>
        </aside>

        {/* Document List Sidebar (Collapsible) */}
        <AnimatePresence initial={false}>
          {sidebarOpen && currentView === 'documents' && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-white border-r border-slate-200 flex flex-col overflow-hidden shrink-0"
            >
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                 <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dokumen Anda</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredDocuments.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group text-left",
                      selectedDocId === doc.id 
                        ? "bg-blue-50 text-blue-700 border border-blue-100" 
                        : "hover:bg-slate-50 text-slate-600 border border-transparent"
                    )}
                  >
                    <FileText className={cn("w-4 h-4 shrink-0", selectedDocId === doc.id ? "text-blue-500" : "text-slate-300")} />
                    <span className="text-xs font-medium truncate flex-1">{doc.name}</span>
                    <ChevronRight className={cn("w-3 h-3 transition-opacity", selectedDocId === doc.id ? "opacity-100" : "opacity-0 group-hover:opacity-40")} />
                  </button>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <AnimatePresence mode="wait">
            {currentView === 'regulations' ? (
              <motion.div 
                key="regulations"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
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
                className="flex-1 flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-8 border border-slate-100">
                  <FileText className="w-8 h-8 text-slate-200" />
                </div>
                <h2 className="text-2xl font-bold mb-3 tracking-tight text-slate-800">Pusat Kecerdasan Hukum</h2>
                <p className="text-slate-500 max-w-sm mb-10 text-sm leading-relaxed">
                  Ekstrak wawasan hukum mendalam dan kelola jejak audit yang sempurna untuk semua dokumentasi kasus Anda.
                </p>
                <DocumentManager user={user} onDocSelected={handleSelectDoc} />
              </motion.div>
            ) : (
              <motion.div 
                key="editor"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Secondary Header */}
                <div className="h-12 bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-20">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-tighter">
                      {selectedDoc?.mimeType.includes('pdf') ? 'PDF' : 'TXT'}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 truncate max-w-[300px]">{selectedDoc?.name}</span>
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 border border-blue-100 rounded font-bold uppercase tracking-widest">
                       Terverifikasi Secara Analitis
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-400">
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setActiveTab('chat')}
                        className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'chat' ? "bg-white shadow-sm text-blue-600" : "hover:text-slate-600")}
                      >Analisis</button>
                      <button 
                        onClick={() => setActiveTab('compare')}
                        className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'compare' ? "bg-white shadow-sm text-blue-600" : "hover:text-slate-600")}
                      >Bandingkan</button>
                      <button 
                        onClick={() => setActiveTab('audit')}
                        className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'audit' ? "bg-white shadow-sm text-blue-600" : "hover:text-slate-600")}
                      >Riwayat</button>
                    </div>
                  </div>
                </div>

                {/* Content Panel */}
                <div className="flex-1 flex overflow-hidden">
                  <div className="flex-1 bg-slate-300 overflow-hidden flex flex-col relative group">
                    <DocumentPreview doc={selectedDoc!} />
                  </div>

                  <aside className="w-[400px] bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden shadow-2xl">
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
      <footer className="h-8 bg-slate-900 text-slate-400 px-6 flex items-center justify-between text-[10px] shrink-0 font-mono tracking-wider z-50">
        <div className="flex gap-6">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-blue-400" /> ENCRYPTED_SSL: AES-256</span>
          <span className="opacity-50">CLIENT_ID: {user.uid.substring(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">AUDIT_TRAIL: <span className="text-green-500">ENABLED</span></span>
          <span className="text-blue-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> SCALABILITY_MODE: ACTIVE</span>
        </div>
      </footer>
    </div>
  );
}
