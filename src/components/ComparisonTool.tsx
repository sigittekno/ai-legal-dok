import { useState } from 'react';
import { DocumentData } from '../types';
import { compareDocuments } from '../services/geminiService';
import { FileText, GitCompare, Loader2, ChevronDown, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ComparisonToolProps {
  docA: DocumentData;
  allDocs: DocumentData[];
}

export default function ComparisonTool({ docA, allDocs }: ComparisonToolProps) {
  const [docBId, setDocBId] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const otherDocs = allDocs.filter(d => d.id !== docA.id);
  const docB = otherDocs.find(d => d.id === docBId);

  const handleCompare = async () => {
    if (!docB) return;
    setComparing(true);
    setResult(null);
    try {
      const comparison = await compareDocuments(docA.content, docB.content, docA.name, docB.name);
      setResult(typeof comparison === 'string' ? comparison : JSON.stringify(comparison, null, 2));
    } catch (err) {
      console.error("Comparison failed", err);
      setResult("Encountered an error during cross-examination of the documents.");
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-6 border-b border-slate-200 bg-slate-50/50 shrink-0">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Mesin Referensi Silang</h4>
        
        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Sumbu Referensi</label>
            <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-semibold text-slate-700 truncate">{docA.name}</span>
            </div>
          </div>

          <ChevronDown className="w-4 h-4 mx-auto text-slate-300" />

          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Target Sekunder</label>
            <select
              value={docBId || ''}
              onChange={(e) => setDocBId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-600 outline-none"
            >
              <option value="">Pilih dokumen target...</option>
              {otherDocs.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCompare}
            disabled={!docBId || comparing}
            className="w-full bg-blue-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-20 shadow-lg shadow-blue-600/20 active:scale-95"
          >
            {comparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
            Jalankan Perbandingan
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {comparing ? (
            <motion.div 
              key="comparing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center gap-4 text-center px-10 py-20"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-2 border border-blue-100">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <h5 className="text-[10px] uppercase font-black tracking-widest text-slate-400">Memeriksa Matriks Silang...</h5>
            </motion.div>
          ) : result ? (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 space-y-6"
            >
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm prose prose-sm max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-4 flex items-start gap-3">
                 <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0" />
                 <p className="text-[10px] leading-relaxed text-slate-500 font-medium italic">
                   Catatan: Perbandingan AI menyoroti perbedaan material saja. Tinjau sumber utama untuk ketepatan teknis absolut.
                 </p>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-30">
              <GitCompare className="w-12 h-12 text-slate-200 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pilih target untuk memulai referensi silang</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
