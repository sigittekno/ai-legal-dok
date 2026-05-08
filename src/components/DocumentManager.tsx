import { useState, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firebaseUtils';
import { OperationType } from '../types';
import { performOCR } from '../services/geminiService';
import { Upload, Plus, FileUp, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// pdfjs worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface DocumentManagerProps {
  user: User;
  onDocSelected: (id: string) => void;
  compact?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function DocumentManager({ user, onDocSelected, compact }: DocumentManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (data: ArrayBuffer): Promise<string> => {
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError("Ukuran file melebihi batas 5MB.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      let content = '';
      const isPDF = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');
      const isText = file.type.startsWith('text/') || file.type === 'application/json' || file.name.endsWith('.md');

      if (isPDF) {
        const arrayBuffer = await file.arrayBuffer();
        content = await extractTextFromPDF(arrayBuffer);
        
        // Fallback to AI OCR if text extraction is empty (scanned PDF)
        if (!content || content.trim().length === 0) {
          console.log("Scanned PDF detected, falling back to AI OCR...");
          const base64 = await fileToBase64(file);
          content = await performOCR(base64, file.type);
        }
      } else if (isImage) {
        console.log("Image detected, using AI OCR for extraction...");
        const base64 = await fileToBase64(file);
        content = await performOCR(base64, file.type);
      } else if (isText) {
        content = await file.text();
      } else {
        throw new Error("Format file tidak didukung. Silakan unggah PDF, Gambar (JPG/PNG), atau Teks.");
      }

      if (!content || content.trim().length === 0) {
        throw new Error("Gagal mengekstrak teks. Mohon pastikan dokumen terbaca dengan jelas.");
      }

      const docRef = await addDoc(collection(db, 'documents'), {
        name: file.name,
        ownerId: user.uid,
        content: content,
        mimeType: file.type,
        size: file.size,
        currentVersion: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tags: []
      });

      // Add to audit log
      await addDoc(collection(db, `documents/${docRef.id}/auditLogs`), {
        documentId: docRef.id,
        userId: user.uid,
        action: 'UPLOAD',
        details: `Unggahan awal dari ${file.name}`,
        timestamp: serverTimestamp()
      });

      onDocSelected(docRef.id);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unggahan gagal.");
      handleFirestoreError(err, OperationType.WRITE, 'documents');
    } finally {
      setUploading(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept=".pdf,.txt,.md,.jpg,.jpeg,.png"
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Unggah Dokumen
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".pdf,.txt,.md,.jpg,.jpeg,.png"
      />
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "w-full max-w-lg p-14 border border-slate-200 border-dashed rounded-3xl cursor-pointer transition-all flex flex-col items-center justify-center text-center group bg-white shadow-sm",
          uploading ? "bg-slate-50 border-transparent pointer-events-none" : "hover:bg-slate-50 hover:border-blue-200"
        )}
      >
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
          {uploading ? <Loader2 className="w-8 h-8 text-blue-600 animate-spin" /> : <Upload className="w-8 h-8 text-blue-400" />}
        </div>
        
        <h3 className="text-xl mb-2 font-bold text-slate-800">
          {uploading ? "Memproses Dokumen..." : "Analisis Mendalam"}
        </h3>
        <p className="text-xs text-slate-400 mb-8 font-medium uppercase tracking-[0.2em]">
          PDF, JPG, PNG, atau Teks (Maks 5MB)
        </p>

        {!uploading && (
           <span className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 group-hover:bg-blue-700 transition-all">
             Mulai Ekstraksi Hukum
           </span>
        )}
      </div>

      {error && (
        <div className="mt-8 flex items-center gap-3 bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
        </div>
      )}
    </div>
  );
}
