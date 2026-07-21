import { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, Plus, CheckCircle, Clock, BookOpen, FolderOpen, 
  FileText, FileImage, FileCode, AlertCircle, Trash2, Search, Filter, RefreshCw
} from 'lucide-react';
import { useExamModelsStore, useCoursesStore, useModulesStore } from '../../../store';
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
    togglePublish,
    bulkPublish,
    bulkDelete
  } = useExamModelsStore();

  const { courses, fetchCourses } = useCoursesStore();
  const { fetchModules } = useModulesStore();

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
    void fetchModules();
  }, [fetchExamModels, fetchCourses, fetchModules]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, filters, itemsPerPage]);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setFilters({ searchQuery: q });
  };

  // Filtered Exam Models
  const filteredModels = useMemo(() => {
    return examModels.filter((item) => {
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        matchesSearch =
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.courseName && item.courseName.toLowerCase().includes(q));
      }
      return matchesSearch;
    });
  }, [examModels, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: examModels.length,
      midterms: examModels.filter((x) => x.category === 'MIDTERM').length,
      finals: examModels.filter((x) => x.category === 'FINAL').length,
      published: examModels.filter((x) => x.isPublished).length,
      drafts: examModels.filter((x) => !x.isPublished).length,
      pdfCount: examModels.filter((x) => x.contentType === 'PDF').length,
      imageCount: examModels.filter((x) => x.contentType === 'IMAGE').length,
      markdownCount: examModels.filter((x) => x.contentType === 'MARKDOWN').length,
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

  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'delete') => {
    if (selectedIds.length === 0) return;

    if (action === 'delete' && !confirm(`تأكيد حذف ${selectedIds.length} نموذج امتحان؟ لا يمكن التراجع.`)) {
      return;
    }

    setBulkLoading(true);
    try {
      if (action === 'publish') await bulkPublish(selectedIds, true);
      else if (action === 'unpublish') await bulkPublish(selectedIds, false);
      else if (action === 'delete') await bulkDelete(selectedIds);
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
            إدارة نماذج الامتحانات (Exam Models)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            نماذج امتحانات واختبارات مستقلة للمقررات والوحدات (PDF، صورة، أو Markdown).
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleOpenCreate}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-2xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            إضافة نموذج امتحان
          </button>
        </div>
      </div>

      {/* Analytics & Stats Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatWidget title="إجمالي النماذج" value={stats.total} icon={FileSpreadsheet} color="#3B82F6" bg="#EFF6FF" />
        <StatWidget title="امتحانات نصفية" value={stats.midterms} icon={Clock} color="#F59E0B" bg="#FEF3C7" />
        <StatWidget title="امتحانات نهائية" value={stats.finals} icon={CheckCircle} color="#10B981" bg="#ECFDF5" />
        <StatWidget title="النماذج المنشورة" value={stats.published} icon={CheckCircle} color="#059669" bg="#D1FAE5" />
        <StatWidget title="نماذج PDF" value={stats.pdfCount} icon={FileText} color="#EF4444" bg="#FEF2F2" />
        <StatWidget title="Markdown / صور" value={stats.markdownCount + stats.imageCount} icon={FileCode} color="#8B5CF6" bg="#F5F3FF" />
      </div>

      {/* Toolbar & Filter Drawer */}
      <div className="space-y-4">
        <ExamModelToolbar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((p) => !p)}
          onCreateOpen={handleOpenCreate}
        />

        {showFilters && (
          <ExamModelFilters
            filters={filters}
            onChange={(newF) => setFilters(newF)}
            onReset={resetFilters}
          />
        )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onDelete={() => handleBulkAction('delete')}
        onPublish={() => handleBulkAction('publish')}
        onUnpublish={() => handleBulkAction('unpublish')}
        loading={bulkLoading}
      />

      {/* Content Rendering */}
      {error && examModels.length === 0 ? (
        <div className="bg-white rounded-3xl border border-red-100 p-12 text-center shadow-xl flex flex-col items-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">تعذر تحميل بيانات نماذج الامتحانات</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md">{error}</p>
          <button
            onClick={() => void fetchExamModels()}
            className="px-6 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold text-xs shadow-md"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : examModels.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
          <EmptyState
            icon={FileSpreadsheet}
            title="لا توجد نماذج امتحانات مضافة بعد"
            description="أنشئ نماذج امتحانات مستقلة للمقررات والوحدات (نصفية، نهائية، أسئلة سنوات سابقة) وارفاق ملفات PDF أو صور أو محتوى مقالي."
            action={
              <button
                onClick={handleOpenCreate}
                className="px-6 py-3 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                إنشاء أول نموذج امتحان الآن
              </button>
            }
          />
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
          <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-700 mb-1">لا توجد نتائج مطابقة لفلتر البحث</h3>
          <p className="text-xs text-slate-400">لم يتم العثور على نماذج امتحانات تطابق المعايير المحددة.</p>
          <button
            onClick={resetFilters}
            className="mt-4 text-emerald-600 hover:text-emerald-700 font-bold text-xs underline underline-offset-4"
          >
            مسح الفلاتر
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>نماذج الامتحانات ({filteredModels.length})</span>
            <span>الصفحة {currentPage} من {Math.ceil(filteredModels.length / itemsPerPage)}</span>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedModels.map((model) => (
                <ExamModelCard
                  key={model.id}
                  examModel={model}
                  isSelected={selectedIds.includes(String(model.id))}
                  onSelect={handleToggleSelect}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteSingle}
                  onPreview={handleOpenPreview}
                  onTogglePublish={togglePublish}
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
              onDelete={handleDeleteSingle}
              onPreview={handleOpenPreview}
              onTogglePublish={togglePublish}
            />
          )}

          <Pagination
            currentPage={currentPage}
            totalItems={filteredModels.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      )}

      {/* Form Modal */}
      <ExamModelFormModal
        isOpen={showFormModal}
        editingModel={editingModel}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveForm}
      />

      {/* Preview Modal */}
      <ExamModelPreviewModal
        isOpen={showPreviewModal}
        examModel={previewModel}
        onClose={() => setShowPreviewModal(false)}
      />
    </div>
  );
}
