import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, ArrowRight, Trash2 } from 'lucide-react';
import { School, Phase, CommercialStatus } from '../types';
import * as XLSX from 'xlsx';
import { createSchool, updateSchool } from '../services/schools';
import { isSupabaseConfigured } from '../services/supabase';
import { useToast } from '../context/ToastContext';
import { useCRM } from '../context/CRMContext';

interface ImportError {
  rowIndex: number;
  message: string;
}

const Importer: React.FC = () => {
  const toast = useToast();
  const { schools: existingSchools, refetchSchools, handleImportedSchools } = useCRM();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ new: 0, updated: 0, total: 0 });
  const [progress, setProgress] = useState<{ processed: number; total: number; created: number; updated: number; errors: ImportError[] } | null>(null);
  const [lastImportErrors, setLastImportErrors] = useState<ImportError[]>([]);

  const expectedColumns = [
    'Nombre del centro',
    'Ubicación',
    'Teléfono',
    'Email',
    'Persona de contacto'
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStep(2);
    }
  };

  const processImport = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        if (jsonData.length < 1) {
          toast.toast.error('El archivo está vacío.');
          setIsProcessing(false);
          return;
        }

        const hasHeader = jsonData[0].some(cell =>
          typeof cell === 'string' &&
          (String(cell).toLowerCase().includes('nombre') || String(cell).toLowerCase().includes('centro'))
        );

        const dataRows = hasHeader ? jsonData.slice(1) : jsonData;
        const rowsToProcess: { row: unknown[]; index: number }[] = [];
        dataRows.forEach((row, index) => {
          if (!row || !Array.isArray(row) || row.length === 0 || !row[0]) return;
          const name = String(row[0] || '').trim();
          const email = String(row[3] || '').trim().toLowerCase();
          if (!name || !email) return;
          rowsToProcess.push({ row, index: hasHeader ? index + 1 : index });
        });

        let created = 0;
        let updated = 0;
        const errors: ImportError[] = [];
        const currentSchools = [...existingSchools];

        setProgress({ processed: 0, total: rowsToProcess.length, created: 0, updated: 0, errors: [] });

        if (isSupabaseConfigured() && refetchSchools) {
          for (let i = 0; i < rowsToProcess.length; i++) {
            const { row, index: rowIndex } = rowsToProcess[i];
            const r = row as (string | number)[];
            const name = String(r[0] || '').trim();
            const city = String(r[1] || '').trim();
            const phone = String(r[2] || '').trim();
            const email = String(r[3] || '').trim().toLowerCase();
            const contact = String(r[4] || '').trim();

            const existing = existingSchools.find(s =>
              s.email.toLowerCase() === email || (s.phone && phone && s.phone === phone)
            );

            try {
              if (existing) {
                const result = await updateSchool(existing.id, { name, city, region: city, phone, email, contactPerson: contact, role: 'Contacto General', notes: 'Importado de Excel' });
                if (result) updated++; else errors.push({ rowIndex, message: `Fila ${rowIndex}: no se pudo actualizar` });
              } else {
                const schoolData: School = {
                  id: '',
                  name,
                  city,
                  region: city,
                  phone,
                  email,
                  contactPerson: contact,
                  role: 'Contacto General',
                  notes: 'Importado de Excel',
                  phase: Phase.LEAD,
                  status: CommercialStatus.NONE,
                  activities: [],
                  tasks: [],
                  milestones: []
                };
                const result = await createSchool(schoolData);
                if (result) created++; else errors.push({ rowIndex, message: `Fila ${rowIndex}: no se pudo crear` });
              }
            } catch (err) {
              errors.push({ rowIndex, message: `Fila ${rowIndex}: ${err instanceof Error ? err.message : 'Error'}` });
            }
            setProgress({ processed: i + 1, total: rowsToProcess.length, created, updated, errors: [...errors] });
          }
          refetchSchools();
          if (errors.length > 0) toast.toast.error(`${created} creados, ${updated} actualizados, ${errors.length} errores`);
          else toast.toast.success(`Importación completada: ${created} creados, ${updated} actualizados`);
        } else {
          rowsToProcess.forEach(({ row }, i) => {
            const r = row as (string | number)[];
            const name = String(r[0] || '').trim();
            const city = String(r[1] || '').trim();
            const phone = String(r[2] || '').trim();
            const email = String(r[3] || '').trim().toLowerCase();
            const contact = String(r[4] || '').trim();
            const existingIndex = currentSchools.findIndex(s => s.email.toLowerCase() === email || (s.phone && phone && s.phone === phone));
            const schoolData: School = {
              id: existingIndex !== -1 ? currentSchools[existingIndex].id : `xlsx-${Date.now()}-${i}`,
              name,
              city,
              region: city,
              phone,
              email,
              contactPerson: contact,
              role: 'Contacto General',
              notes: 'Importado de Excel',
              phase: existingIndex !== -1 ? currentSchools[existingIndex].phase : Phase.LEAD,
              status: existingIndex !== -1 ? currentSchools[existingIndex].status : CommercialStatus.NONE,
              activities: existingIndex !== -1 ? currentSchools[existingIndex].activities : [],
              tasks: existingIndex !== -1 ? currentSchools[existingIndex].tasks : [],
              milestones: existingIndex !== -1 ? currentSchools[existingIndex].milestones : []
            };
            if (existingIndex !== -1) { currentSchools[existingIndex] = schoolData; updated++; } else { currentSchools.unshift(schoolData); created++; }
          });
          handleImportedSchools(currentSchools);
          toast.toast.success('Importación completada');
        }

        setStats({ new: created, updated, total: rowsToProcess.length });
        setLastImportErrors(errors);
        setStep(3);
        setProgress(null);
        setIsProcessing(false);
      } catch (error) {
        console.error("Error al procesar el archivo:", error);
        toast.toast.error("Error al procesar el archivo. Asegúrate de que sea un formato válido.");
        setIsProcessing(false);
        setProgress(null);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6 sm:space-y-8">
      <div className="text-center">
        <h2 className="text-xl sm:text-3xl font-extrabold text-primary">Importador de Datos</h2>
        <p className="text-brand-500 mt-2 font-body text-sm sm:text-base">Procesa archivos .xlsx o .csv con detección de duplicados.</p>
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 overflow-x-auto">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 ${step >= s ? 'text-brand-600' : 'text-brand-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-brand-600 border-brand-600 text-white' : 'border-brand-200'}`}>{s}</div>
            </div>
            {s < 3 && <div className={`w-12 h-[2px] ${step > s ? 'bg-brand-600' : 'bg-brand-200'}`}></div>}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl border border-brand-200 shadow-xl overflow-hidden min-h-[320px] sm:min-h-[420px]">
        {step === 1 && (
          <div className="p-6 sm:p-12 flex flex-col items-center justify-center text-center space-y-6 sm:space-y-8">
            <div className="w-24 h-24 bg-brand-100 text-brand-600 rounded-[2rem] flex items-center justify-center shadow-inner">
              <Upload size={48} />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-bold text-primary">Arrastra o selecciona tu Excel/CSV</p>
              <p className="text-brand-400 text-sm max-w-sm font-body">El sistema leerá las 5 columnas especificadas.</p>
            </div>
            <label className="bg-primary text-white px-10 py-4 rounded-2xl font-bold hover:bg-brand-600 transition-all cursor-pointer shadow-xl flex items-center gap-3 active:scale-95">
              Subir Archivo <ArrowRight size={20} />
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="p-4 sm:p-10 space-y-6 sm:space-y-8">
            <div className="bg-brand-100 p-5 rounded-2xl border border-brand-200 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <FileText className="text-brand-600" size={24} />
                </div>
                <div>
                  <span className="font-bold text-primary block">{file?.name}</span>
                  <span className="text-xs text-brand-600/70 font-body">Listo para procesar</span>
                </div>
              </div>
              <button onClick={() => setStep(1)} className="text-brand-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {expectedColumns.map((col, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-brand-100/30 border border-brand-100 rounded-2xl">
                  <span className="text-sm font-bold text-primary">{col}</span>
                  <div className="flex items-center gap-2 text-green-600 text-[10px] font-bold bg-green-50 px-2 py-1 rounded-full uppercase">
                    Mapeado
                  </div>
                </div>
              ))}
            </div>

            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-body text-brand-500">
                  <span>Procesando {progress.processed} de {progress.total}</span>
                  <span>{progress.created} creados, {progress.updated} actualizados{progress.errors.length > 0 ? `, ${progress.errors.length} errores` : ''}</span>
                </div>
                <div className="h-2 bg-brand-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress.total ? (100 * progress.processed / progress.total) : 0}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-brand-100 flex justify-end gap-4">
              <button disabled={isProcessing} onClick={() => setStep(1)} className="px-8 py-3 rounded-2xl text-brand-500 font-bold text-sm hover:bg-brand-100/50">Cancelar</button>
              <button
                disabled={isProcessing}
                onClick={processImport}
                className="px-10 py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-brand-600 transition-all shadow-lg shadow-primary/20 flex items-center gap-3 disabled:opacity-50"
              >
                {isProcessing ? (progress ? `Procesando ${progress.processed}/${progress.total}...` : 'Analizando...') : 'Iniciar Procesamiento'}
                {!isProcessing && <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-6 sm:p-12 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-3xl font-extrabold text-primary">Importación completada</h3>
            <p className="text-brand-500 mt-2 mb-10 text-lg font-body">Se han procesado un total de <span className="font-bold text-primary">{stats.total}</span> registros.</p>

            <div className="grid grid-cols-2 gap-6 w-full max-w-lg mb-10">
              <div className="bg-brand-100/30 p-6 rounded-3xl border border-brand-100 shadow-sm">
                <p className="text-3xl font-extrabold text-brand-600">{stats.new}</p>
                <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mt-1">Centros Nuevos</p>
              </div>
              <div className="bg-brand-100/30 p-6 rounded-3xl border border-brand-100 shadow-sm">
                <p className="text-3xl font-extrabold text-primary">{stats.updated}</p>
                <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mt-1">Actualizados</p>
              </div>
            </div>

            {lastImportErrors.length > 0 && (
              <div className="w-full max-w-lg mb-6 text-left bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-bold text-red-700 mb-2">Errores ({lastImportErrors.length})</p>
                <ul className="text-xs font-body text-red-600 space-y-1 max-h-32 overflow-y-auto">
                  {lastImportErrors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err.message}</li>
                  ))}
                  {lastImportErrors.length > 10 && <li>... y {lastImportErrors.length - 10} más</li>}
                </ul>
              </div>
            )}

            <button
              onClick={() => {
                window.dispatchEvent(new Event('refresh-schools'));
                setStep(1);
              }}
              className="px-12 py-4 rounded-2xl bg-primary text-white font-bold hover:bg-brand-600 transition-all shadow-xl"
            >
              Ver Lista Actualizada
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Importer;
