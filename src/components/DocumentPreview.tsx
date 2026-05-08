import { useState } from 'react';
import { DocumentData } from '../types';
import { Download, PlusCircle, MinusCircle, Scale } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';

interface DocumentPreviewProps {
  doc: DocumentData;
}

export default function DocumentPreview({ doc }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(1);

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-200">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
        <div className="flex gap-2">
           <div className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all cursor-pointer" onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}>
              <MinusCircle className="w-4 h-4" />
           </div>
           <div className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all cursor-pointer" onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}>
              <PlusCircle className="w-4 h-4" />
           </div>
           <div className="flex items-center px-3 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {Math.round(zoom * 100)}%
           </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95">
           <Download className="w-3 h-3" />
           Ekspor PDF
        </button>
      </div>

      <div className="flex-1 overflow-auto p-12 bg-slate-300 shadow-inner group">
        <motion.div 
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          className="mx-auto bg-white shadow-2xl p-16 min-h-full max-w-4xl border border-slate-100 relative group-hover:shadow-blue-600/5 transition-shadow duration-700"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <Scale className="w-32 h-32 text-slate-200 -rotate-12" />
          </div>
          <div className="prose prose-slate max-w-none prose-sm selection:bg-blue-100 selection:text-blue-900 leading-loose">
            <h1 className="text-center font-bold tracking-tighter mb-12 uppercase text-slate-300 border-b border-slate-100 pb-8">{doc.name}</h1>
            {doc.mimeType === 'application/pdf' ? (
              <div className="whitespace-pre-wrap font-sans text-slate-700">
                {doc.content}
              </div>
            ) : (
              <ReactMarkdown>{doc.content}</ReactMarkdown>
            )}
          </div>
          
          <div className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center opacity-40">
             <span className="text-[8px] font-mono tracking-widest uppercase">DIPROSES_OLEH_LEXAI_ENGINE</span>
             <span className="text-[8px] font-mono tracking-widest uppercase">SALINAN_ASLI_ID: {doc.id.substring(0, 12)}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
