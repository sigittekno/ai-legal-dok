import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuditLogEntry, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firebaseUtils';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AuditLogViewerProps {
  docId: string;
}

export default function AuditLogViewer({ docId }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, `documents/${docId}/auditLogs`),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry));
      setLogs(logData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `documents/${docId}/auditLogs`);
    });

    return () => unsubscribe();
  }, [docId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="p-6 border-b border-slate-200 shrink-0 bg-slate-50/50">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Jejak Audit Keamanan</h4>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {logs.length === 0 ? (
          <div className="text-center py-20 opacity-30">
            <ShieldCheck className="w-8 h-8 mx-auto mb-3" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Tidak ada aktivitas tercatat</p>
          </div>
        ) : (
          <div className="relative border-l border-slate-100 ml-2 space-y-8 pb-12">
            {logs.map((log) => (
              <div key={log.id} className="relative pl-8 group">
                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-white border-2 border-slate-200 group-hover:border-blue-500 transition-colors" />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      {log.action}
                    </span>
                    <span className="text-[9px] text-slate-300 font-mono">
                      {log.timestamp ? (
                        format(
                          typeof (log.timestamp as any).toDate === 'function' 
                            ? (log.timestamp as any).toDate() 
                            : new Date(log.timestamp), 
                          'HH:mm:ss'
                        )
                      ) : '...'}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">{log.details}</p>
                  <p className="text-[9px] text-slate-400">UID: {log.userId.substring(0, 8)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
