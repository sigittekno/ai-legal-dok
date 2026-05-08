import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  onSnapshot, 
  orderBy, 
  query 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DocumentData, ChatMessage, AnalysisResult, OperationType, LegalMemo } from '../types';
import { analyzeLegalDocument, chatWithDocument, generateMemo, generateTTS } from '../services/geminiService';
import { handleFirestoreError } from '../lib/firebaseUtils';
import { Send, Loader2, Info, AlertCircle, Sparkles, MessageSquare, List, Activity, FileText, Download, User, Calendar, FileType, Volume2, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ChatPanelProps {
  doc: DocumentData;
}

export default function ChatPanel({ doc }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [view, setView] = useState<'chat' | 'analysis' | 'memo'>('analysis');
  const [memo, setMemo] = useState<LegalMemo | null>(null);
  const [generatingMemo, setGeneratingMemo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const handlePlayVoice = async (text: string) => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    setIsPlaying(true);
    try {
      const base64 = await generateTTS(text);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const audioCtx = audioContextRef.current;
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Int16Array(len / 2);
      
      for (let i = 0; i < len; i += 2) {
        bytes[i / 2] = binaryString.charCodeAt(i) | (binaryString.charCodeAt(i + 1) << 8);
      }

      const float32 = new Float32Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        float32[i] = bytes[i] / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
      };
      
      sourceNodeRef.current = source;
      source.start();
    } catch (err) {
      console.error("TTS failed", err);
      setIsPlaying(false);
    }
  };

  const ANALYSIS_STEPS = [
    "Ekstraksi Struktur & Semantik Dokumen",
    "Identifikasi Klausul & Kewajiban Hukum",
    "Analisis Yurisprudensi Hukum",
    "Pemetaan Risiko & Mitigasi Penapisan",
    "Sinkronisasi Database Hukum Nasional",
    "Finalisasi Laporan Intelijen Hukum"
  ];
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, analyzing]);

  useEffect(() => {
    // Run initial analysis
    const runAnalysis = async () => {
      setAnalyzing(true);
      setAnalysisStep(0);
      setMemo(null);
      
      // Step interval simulation
      const stepInterval = setInterval(() => {
        setAnalysisStep(prev => (prev < 5 ? prev + 1 : prev));
      }, 2500);

      try {
        const result = await analyzeLegalDocument(doc.content, doc.name);
        setAnalysis(result);
      } catch (err) {
        console.error("Analysis failed", err);
      } finally {
        clearInterval(stepInterval);
        setAnalysisStep(5);
        setAnalyzing(false);
      }
    };
    runAnalysis();
    
    // Clear chat when doc changes
    setMessages([]);
  }, [doc.id]);

  const handleGenerateMemo = async () => {
    if (!analysis || generatingMemo) return;
    setGeneratingMemo(true);
    try {
      const result = await generateMemo(analysis, doc.name);
      setMemo(result);
      
      await addDoc(collection(db, `documents/${doc.id}/auditLogs`), {
        documentId: doc.id,
        userId: doc.ownerId,
        action: 'CHAT',
        details: `Generated Legal Memo for ${doc.name}`,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Memo generation failed", err);
    } finally {
      setGeneratingMemo(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithDocument(doc.content, messages, input);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
      
      // Audit log chat
      await addDoc(collection(db, `documents/${doc.id}/auditLogs`), {
        documentId: doc.id,
        userId: doc.ownerId,
        action: 'CHAT',
        details: `Asked: ${input.substring(0, 50)}...`,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Chat failed", err);
      setMessages(prev => [...prev, { role: 'model', text: "Forgive me, but I encountered an error while processing your request. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-[#fcfdfe]">
      {/* View Toggle */}
      <div className="flex bg-slate-900 border-b border-white/5 shrink-0 p-1">
        <button 
          onClick={() => setView('analysis')}
          className={cn(
            "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-lg",
            view === 'analysis' 
              ? "bg-slate-800 text-gold-500 shadow-executive ring-1 ring-white/10" 
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          Intelijen
        </button>
        <button 
          onClick={() => setView('memo')}
          className={cn(
            "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-lg",
            view === 'memo' 
              ? "bg-slate-800 text-gold-500 shadow-executive ring-1 ring-white/10" 
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          Draft Memo
        </button>
        <button 
          onClick={() => setView('chat')}
          className={cn(
            "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-lg",
            view === 'chat' 
              ? "bg-slate-800 text-gold-500 shadow-executive ring-1 ring-white/10" 
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          Konsultasi
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {view === 'analysis' ? (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto p-6 space-y-8"
            >
              {analyzing ? (
                <div className="flex flex-col h-full py-12 px-4">
                  <div className="flex-1 flex flex-col items-center justify-center gap-8">
                    <div className="relative">
                       <motion.div 
                         animate={{ rotate: 360 }}
                         transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                         className="w-24 h-24 rounded-full border-2 border-slate-100 border-t-blue-600"
                       />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <Activity className="w-8 h-8 text-blue-600/20" />
                       </div>
                    </div>
                    
                    <div className="space-y-4 w-full max-w-xs">
                      {ANALYSIS_STEPS.map((stepText, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ 
                            opacity: analysisStep >= idx ? 1 : 0.2,
                            x: 0,
                            scale: analysisStep === idx ? 1.05 : 1
                          }}
                          className="flex items-center gap-4"
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center text-[8px] font-black",
                            analysisStep > idx ? "bg-green-500 border-green-500 text-white" :
                            analysisStep === idx ? "border-blue-600 text-blue-600 animate-pulse" : "border-slate-200 text-slate-300"
                          )}>
                            {analysisStep > idx ? "✓" : idx + 1}
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest",
                            analysisStep === idx ? "text-slate-800" : "text-slate-400"
                          )}>
                            {stepText}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <p className="text-center font-mono text-[9px] uppercase tracking-widest text-slate-300">LexAI Intel Engine v3.1 // High-Precision Processing</p>
                </div>
              ) : analysis ? (
                <>
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ringkasan Eksekutif</h4>
                      <button 
                        onClick={() => handlePlayVoice(analysis.summary)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
                          isPlaying 
                            ? "bg-red-50 text-red-600 border-red-100 animate-pulse" 
                            : "bg-blue-900 text-white border-blue-800 hover:bg-slate-800 shadow-lg"
                        )}
                      >
                        {isPlaying ? (
                          <><Square className="w-2.5 h-2.5 fill-current" /> Berhenti</>
                        ) : (
                          <><Volume2 className="w-3 h-3" /> Bacakan</>
                        )}
                      </button>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-800 font-medium">
                      {analysis.summary}
                    </p>
                  </section>

                  {analysis.articleMatrix && analysis.articleMatrix.length > 0 && (
                    <section className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Matriks Analisis Pasal Utama</h4>
                      <div className="overflow-hidden border border-slate-200 rounded-3xl bg-white shadow-executive overflow-x-auto scrollbar-hide">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 border-b border-slate-800">
                              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">Pasal</th>
                              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 min-w-[150px]">Teks</th>
                              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 min-w-[200px]">Interpretasi AI</th>
                              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Impak</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {analysis.articleMatrix.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-5 py-5 align-top">
                                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-900 text-gold-500 text-[10px] font-black border border-white/5 shadow-md">
                                    {item.article}
                                  </span>
                                </td>
                                <td className="px-5 py-5 align-top text-xs font-black text-slate-900 tracking-tighter uppercase leading-tight">
                                  {item.content}
                                </td>
                                <td className="px-5 py-5 align-top text-[11px] text-slate-500- font-medium leading-relaxed italic">
                                  {item.interpretation}
                                </td>
                                <td className="px-5 py-5 align-top">
                                  <span className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest",
                                    item.impact === 'HIGH' ? "bg-red-50 text-red-600 border-red-100" :
                                    item.impact === 'MEDIUM' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                    "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  )}>
                                    {item.impact}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  <section className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Struktur & Semantik</h4>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-[11px] leading-relaxed text-slate-600 italic">
                      {analysis.structure}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Klausul & Kewajiban Strategis</h4>
                    <div className="space-y-4">
                      {analysis.keyClauses.map((clause, i) => (
                        <div key={i} className="flex flex-col p-6 bg-white rounded-[1.5rem] border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all shadow-executive">
                          <div className="flex items-start gap-5 mb-4">
                            <div className="w-10 h-10 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center shrink-0 text-sm font-black border border-slate-200">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-black text-slate-900 mb-1.5 uppercase tracking-tighter">{clause.title}</h5>
                              <p className="text-[11px] leading-relaxed text-slate-500 font-medium line-clamp-3 mb-3">{clause.text}</p>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
                                  clause.importance === 'High' ? "bg-red-50 border-red-100 text-red-600" :
                                  clause.importance === 'Medium' ? "bg-amber-50 border-amber-100 text-amber-600" :
                                  "bg-emerald-50 border-emerald-100 text-emerald-600"
                                )}>
                                    Security Tier: {clause.importance}
                                </span>
                              </div>
                            </div>
                          </div>
                          {clause.obligation && (
                            <div className="mt-2 pt-4 border-t border-slate-100">
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Mandatory Requirement:</p>
                                <p className="text-[11px] text-slate-800 leading-relaxed font-bold italic">{clause.obligation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yurisprudensi Terkait</h4>
                    <div className="space-y-2">
                      {analysis.jurisprudence.map((item, i) => (
                        <div key={i} className="flex gap-3 items-start p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                          <Sparkles className="w-3 h-3 text-indigo-400 mt-0.5" />
                          <p className="text-[11px] text-indigo-900 leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pemetaan Risiko & Mitigasi</h4>
                    <div className="space-y-3">
                      {analysis.risks.map((risk, i) => (
                        <div key={i} className="flex flex-col p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                          <div className="flex gap-4 items-start mb-3">
                            <div className="w-6 h-6 bg-amber-100 text-amber-600 rounded flex items-center justify-center shrink-0 text-[10px] font-bold">!</div>
                            <div className="flex-1">
                              <p className="text-[11px] font-bold text-amber-900 mb-1">{risk.description}</p>
                              <span className="text-[8px] uppercase font-black text-amber-400 tracking-widest">• Dampak {risk.impact}</span>
                            </div>
                          </div>
                          <div className="bg-white/60 p-3 rounded-lg border border-amber-200/50">
                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                              Mitigasi
                            </p>
                            <p className="text-[10px] text-amber-900 leading-relaxed font-normal">{risk.mitigation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sinkronisasi Database Hukum</h4>
                    <div className="p-4 bg-slate-900 rounded-xl text-green-400 font-mono text-[10px] leading-relaxed flex gap-3 items-start">
                       <Activity className="w-4 h-4 text-green-500 animate-pulse shrink-0" />
                       <span>{analysis.legalSync}</span>
                    </div>
                  </section>

                  <section className="space-y-4 pb-12">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Penyelesaian Analisis</h4>
                    <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50">
                       <ul className="space-y-4">
                          {analysis.insights.map((insight, i) => (
                            <li key={i} className="flex gap-4 items-start text-xs text-slate-600 font-normal leading-relaxed group">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0 group-hover:scale-150 transition-transform" />
                              {insight}
                            </li>
                          ))}
                       </ul>
                    </div>
                  </section>
                </>
              ) : (
                 <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Menunggu Transmisi...</p>
                 </div>
              )}
            </motion.div>
          ) : view === 'memo' ? (
            <motion.div 
              key="memo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full overflow-y-auto bg-slate-50 p-6"
            >
              {!memo ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
                   <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
                      <FileType className="w-8 h-8 text-blue-600" />
                   </div>
                   <h3 className="text-lg font-bold text-slate-800 mb-2">Penyusunan Memo Hukum</h3>
                   <p className="text-xs text-slate-400 max-w-[280px] leading-relaxed mb-8 uppercase tracking-widest font-black">
                     Ubah hasil inteligensi hukum menjadi draf memo formal dalam hitungan detik.
                   </p>
                   <button 
                     onClick={handleGenerateMemo}
                     disabled={generatingMemo || !analysis}
                     className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-3 disabled:opacity-50"
                   >
                     {generatingMemo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                     Generate Draft Memo
                   </button>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Legal Memo Draft // Internal Use</span>
                    <button className="flex items-center gap-2 text-[10px] font-bold text-blue-600 hover:text-blue-700">
                       <Download className="w-3 h-3" /> Export .txt
                    </button>
                  </div>
                  
                  <div className="bg-white p-12 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 font-sans">
                     <div className="border-b-4 border-slate-900 pb-8 mb-12">
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-4">{memo.title}</h1>
                        <div className="grid grid-cols-2 gap-4 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                           <div className="flex items-center gap-2"><User className="w-3 h-3" /> To: {memo.recipient}</div>
                           <div className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Date: {memo.date}</div>
                        </div>
                     </div>

                     <div className="space-y-12">
                        <section>
                           <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4">Subject</h4>
                           <p className="text-xl font-bold text-slate-800 leading-tight">{memo.subject}</p>
                        </section>

                        <section>
                           <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">I. Introduction & Summary</h4>
                           <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-normal">{memo.introduction}</div>
                        </section>

                        <section>
                           <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">II. Legal Analysis</h4>
                           <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-normal">{memo.legalAnalysis}</div>
                        </section>

                        <section className="bg-slate-50 -mx-12 p-12 mt-12">
                           <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">III. Conclusion & Recommendations</h4>
                           <div className="text-sm leading-relaxed font-semibold text-slate-900 whitespace-pre-wrap">{memo.conclusion}</div>
                        </section>
                     </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                {messages.length === 0 && (
                   <div className="py-20 flex flex-col items-center justify-center text-center px-10">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                         <MessageSquare className="w-6 h-6 text-slate-200" />
                      </div>
                      <h5 className="text-sm font-bold text-slate-800 mb-2">Mode Konsultasi Hukum</h5>
                      <p className="text-[10px] text-slate-400 leading-relaxed max-w-[200px] font-medium uppercase tracking-tight">
                        Ajukan pertanyaan tentang dokumen menggunakan bahasa alami untuk ekstraksi terarah.
                      </p>
                      
                      <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-[320px]">
                        {[
                          "Ringkas risiko",
                          "Batas tanggung jawab?",
                          "Ketentuan pengakhiran",
                          "Kewajiban utama"
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setInput(suggestion)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-tighter text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                   </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex flex-col gap-1.5 max-w-[90%]", msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
                    <div className={cn(
                      "px-4 py-3 rounded-xl text-sm leading-relaxed shadow-sm transition-all relative group",
                      msg.role === 'user' 
                        ? "bg-slate-800 text-white rounded-br-none" 
                        : "bg-white text-slate-700 rounded-bl-none border border-slate-200"
                    )}>
                      {msg.role === 'model' && (
                        <button 
                          onClick={() => handlePlayVoice(msg.text)}
                          className="absolute -right-8 top-0 p-1.5 text-slate-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Baca Pesan"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="prose prose-sm max-w-none font-normal">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[8px] uppercase font-black tracking-[0.2em] text-slate-300">
                      {msg.role === 'user' ? "Pengguna" : "Konsultan LexAI"}
                    </span>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2 mr-auto items-start">
                    <div className="bg-white p-4 rounded-xl rounded-bl-none border border-slate-200 shadow-sm flex gap-1.5">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 bg-slate-100 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">Kecerdasan LexAI Aktif</span>
                </div>
                <form onSubmit={handleSend} className="relative bg-white rounded-xl shadow-inner border border-slate-200 overflow-hidden ring-offset-2 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ajukan pertanyaan hukum..."
                    className="w-full bg-transparent border-none py-3 pl-4 pr-12 text-xs focus:ring-0 text-slate-800 font-medium"
                    disabled={loading}
                  />
                  <button 
                    disabled={!input.trim() || loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white disabled:opacity-20 hover:bg-blue-700 transition-all shadow-md active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
