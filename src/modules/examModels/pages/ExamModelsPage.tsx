import { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, Plus, AlertCircle, Trash2, Search
} from 'lucide-react';
import { useExamModelsStore, useCoursesStore } from '../../../store';
import { Loader } from '../../../components/feedback/Loader';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { StatWidget } from '../../../components/ui/StatWidget';
import { Pagination } from '../../../components/ui/Pagination';
import { BulkActionBar } from '../../../components/ui/BulkActionBar';
import { CascadeDeleteModal } from '../../../components/ui/CascadeDeleteModal';

import { ExamModelCard } from '../components/ExamModelCard';
import { ExamModelTable } from '../components/ExamModelTable';
import { ExamModelFormModal } from '../components/ExamModelFormModal';
import { ExamModelPreviewModal } from '../components/ExamModelPreviewModal';
import { PageGuide } from '../../../components/ui/PageGuide';
import { ExamModelFilters } from '../components/ExamModelFilters';
import { ExamModelToolbar } from '../components/ExamModelToolbar';

import type { ExamModel, CreateExamModelPayload } from '../../../types/examModel.types';

export function ExamModelsPage() {
  const { 
    examModels, 
    fetchExamModels, 
    isLoading, 
    error,
    filters,
    setFilters,
    resetFilters,
    addExamModel,
    updateExamModel,
    deleteExamModel,
    bulkDelete
  } = useExamModelsStore();

  const { courses, fetchCourses } = useCoursesStore();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingModel, setEditingModel] = useState<ExamModel | null>(null);

  const [previewModel, setPreviewModel] = useState<ExamModel | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  useEffect(() => {
    void fetchExamModels();
    void fetchCourses();
  }, [fetchExamModels, fetchCourses]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, filters, itemsPerPage]);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setFilters({ searchQuery: q });
  };

  const filteredModels = useMemo(() => {
    return examModels.filter((item) => {
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        matchesSearch =
          item.title.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.courseName && item.courseName.toLowerCase().includes(q));
      }
      return matchesSearch;
    });
  }, [examModels, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: examModels.length,
      pdfs: examModels.filter((x) => x.pdfUrl).length,
    };
  }, [examModels]);

  const paginatedModels = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredModels.slice(start, start + itemsPerPage);
  }, [filteredModels, currentPage, itemsPerPage]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === paginatedModels.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedModels.map((x) => String(x.id)));
    }
  };

  const handleOpenCreate = () => {
    setEditingModel(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (model: ExamModel) => {
    setEditingModel(model);
    setShowFormModal(true);
  };

  const handleOpenPreview = (model: ExamModel) => {
    setPreviewModel(model);
    setShowPreviewModal(true);
  };

  const handleSaveForm = async (payload: CreateExamModelPayload & { id?: string }) => {
    if (payload.id) {
      await updateExamModel({ id: payload.id, ...payload });
    } else {
      await addExamModel(payload);
    }
  };

  const handleBulkAction = async (action: 'delete') => {
    if (selectedIds.length === 0) return;

    if (action === 'delete' && !confirm(`تأكيد حذف ${selectedIds.length} نموذج امتحان؟ لا يمكن التراجع.`)) {
      return;
    }

    setBulkLoading(true);
    try {
      if (action === 'delete') await bulkDelete(selectedIds);
      setSelectedIds([]);
    } catch {
      alert('حدث خطأ أثناء تنفيذ الإجراء المجمع.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا النموذج نهائياً؟')) return;
    try {
      await deleteExamModel(id);
    } catch {
      alert('تعذر حذف نموذج الامتحان.');
    }
  };

  if (isLoading && examModels.length === 0) return <Loader fullPage />;

  return (
    <div className="font-sans antialiased text-slate-800 space-y-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-slate-800 to-slate-600 mb-1 flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
            إدارة نماذج الامتحانات (Practice Exams)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            نماذج امتحانات واختبارات تطبيقية للمقررات والمراحل.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleOpenCreate}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-2xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            إضافة نموذج جديد
          </button>
        </div>
      </div>

      <PageGuide
        title="دليل نماذج الامتحانات"
        description="كيفية إدارة النماذج الامتحانية والمراجع"
        steps={[
          {
            title: "إضافة نموذج جديد",
            description: "استخدم زر الإضافة لرفع ملف جديد (مثل ملفات الـ PDF أو الصور) وربطه بمقرر معين ليكون مرجعاً للطلاب."
          },
          {
            title: "المعاينة والحذف",
            description: "يمكنك معاينة النموذج مباشرة أو حذفه بسهولة من الأزرار الجانبية في الجدول."
          }
        ]}
        tips={[
          "يفضل أن تكون عناوين النماذج واضحة ومحددة بالسنة أو الفصل الدراسي لتسهيل البحث."
        ]}
      />

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-bold animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Compact Stats Area */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm px-4 py-2.5 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">إجمالي النماذج</p>
            <p className="text-base font-black text-slate-800">{stats.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm px-4 py-2.5 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">ملفات PDF</p>
            <p className="text-base font-black text-slate-800">{stats.pdfs}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6 relative z-10 overflow-hidden">
        <ExamModelToolbar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />

        {showFilters && (
          <div className="animate-in slide-in-from-top-4 fade-in duration-200">
            <ExamModelFilters
              filters={filters}
              onChange={setFilters}
              onReset={resetFilters}
            />
          </div>
        )}

        {filteredModels.length === 0 ? (
          <EmptyState
            icon={Search}
            title="لا توجد نماذج متطابقة"
            description="جرب تعديل كلمات البحث أو تغيير إعدادات الفلترة للعثور على النماذج المطلوبة."
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {paginatedModels.map((item) => (
              <ExamModelCard
                key={item.id}
                examModel={item}
                isSelected={selectedIds.includes(String(item.id))}
                onSelect={handleToggleSelect}
                onEdit={handleOpenEdit}
                onDelete={(id) => setDeleteConfirmId(id)}
                onPreview={handleOpenPreview}
              />
            ))}
          </div>
        ) : (
          <ExamModelTable
            examModels={paginatedModels}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onEdit={handleOpenEdit}
            onDelete={(id) => setDeleteConfirmId(id)}
            onPreview={handleOpenPreview}
          />
        )}

        {filteredModels.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredModels.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        actions={[
          {
            label: 'حذف المحدد',
            icon: Trash2,
            onClick: () => handleBulkAction('delete'),
            variant: 'danger'
          }
        ]}
        isLoading={bulkLoading}
      />

      <ExamModelFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        editingModel={editingModel}
        onSave={handleSaveForm}
      />

      {previewModel && (
        <ExamModelPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          examModel={previewModel}
        />
      )}

      <CascadeDeleteModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            void handleDeleteSingle(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        title="حذف نموذج الامتحان"
        message="هل أنت متأكد من رغبتك في حذف هذا النموذج؟ هذا الإجراء سيؤدي إلى حذف جميع البيانات المرتبطة به نهائياً ولا يمكن التراجع عنه."
        itemType="examModel"
      />
    </div>
  );
}
