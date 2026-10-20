import { useState, useEffect } from 'react';
import { Button, Input, Table, Tag, Space, Select, message, Tooltip, Avatar } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ClockCircleOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import { Exam, ExamType } from '../../types';
import CreateExamModal from './components/CreateExamModal';
import EditExamModal from './components/EditExamModal';
import DeleteConfirmModal from '../../components/DeleteConfirmModal/DeleteConfirmModal';
import './ExamsPage.css';

const examTypeLabels: Record<ExamType, string> = {
    LESSON_QUIZ: 'اختبار درس',
    COURSE_QUIZ: 'اختبار كورس',
    CHALLENGE: 'تحدي',
};

const examTypeColors: Record<ExamType, string> = {
    LESSON_QUIZ: 'cyan',
    COURSE_QUIZ: 'purple',
    CHALLENGE: 'orange',
};

const ExamsPage = () => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const response = await api.get('/exams');
            setExams(response.data);
        } catch {
            message.error('حدث خطأ في جلب الاختبارات');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedExam) return;
        try {
            await api.delete(`/exams/${selectedExam.id}`);
            message.success('تم حذف الاختبار بنجاح');
            setDeleteModalVisible(false);
            setSelectedExam(null);
            fetchExams();
        } catch {
            message.error('حدث خطأ في حذف الاختبار');
        }
    };

    const getTimeStatus = (exam: Exam) => {
        if (exam.examType !== 'CHALLENGE') return null;
        const now = new Date();
        if (exam.startTime && new Date(exam.startTime) > now) {
            return { text: 'لم يبدأ', color: 'blue' };
        }
        if (exam.endTime && new Date(exam.endTime) < now) {
            return { text: 'انتهى', color: 'red' };
        }
        return { text: 'جاري', color: 'green' };
    };

    const filteredExams = exams.filter((exam) => {
        const matchesSearch = exam.title.toLowerCase().includes(searchText.toLowerCase());
        const matchesType = !filterType || exam.examType === filterType;
        return matchesSearch && matchesType;
    });

    const columns: ColumnsType<Exam> = [
        {
            title: 'العنوان',
            dataIndex: 'title',
            key: 'title',
            width: 250,
            render: (title: string, record: Exam) => (
                <div className="exam-title-cell">
                    {record.imageUrl ? (
                        <Avatar shape="square" size={40} src={record.imageUrl} className="exam-thumbnail" />
                    ) : (
                        <Avatar shape="square" size={40} icon={<TrophyOutlined />} className="exam-thumbnail" style={{ backgroundColor: 'var(--primary-light)' }} />
                    )}
                    <span className="exam-title-text">{title}</span>
                </div>
            ),
        },
        {
            title: 'النوع',
            dataIndex: 'examType',
            key: 'examType',
            width: 130,
            render: (type: ExamType) => (
                <Tag color={examTypeColors[type]} className="exam-type-tag">
                    {examTypeLabels[type]}
                </Tag>
            ),
        },
        {
            title: 'الكورس / الدرس',
            key: 'courseLesson',
            width: 180,
            render: (_: unknown, record: Exam) => (
                <span>
                    {record.course?.title || record.lesson?.title || '-'}
                </span>
            ),
        },
        {
            title: 'نسبة النجاح',
            dataIndex: 'passingScore',
            key: 'passingScore',
            width: 100,
            align: 'center',
            render: (score: number) => (
                <Tag color={score >= 70 ? 'red' : score >= 50 ? 'orange' : 'green'}>{score}%</Tag>
            ),
        },
        {
            title: 'المحاولات',
            dataIndex: 'maxAttempts',
            key: 'maxAttempts',
            width: 90,
            align: 'center',
        },
        {
            title: 'الوقت',
            dataIndex: 'timeLimit',
            key: 'timeLimit',
            width: 110,
            align: 'center',
            render: (time: number | null) => (
                <span>
                    {time ? (
                        <Space><ClockCircleOutlined />{time} دقيقة</Space>
                    ) : (
                        <Tag>بدون حد</Tag>
                    )}
                </span>
            ),
        },
        {
            title: 'المشاركين',
            dataIndex: 'participantsCount',
            key: 'participantsCount',
            width: 100,
            align: 'center',
            render: (count: number) => count || 0,
        },
        {
            title: 'الحالة',
            key: 'status',
            width: 100,
            align: 'center',
            render: (_: unknown, record: Exam) => {
                const status = getTimeStatus(record);
                if (!status) return <Tag>نشط</Tag>;
                return <Tag color={status.color}>{status.text}</Tag>;
            },
        },
        {
            title: 'تاريخ الإنشاء',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 130,
            render: (date: string) => new Date(date).toLocaleDateString('ar-SA'),
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            width: 150,
            fixed: 'left',
            render: (_: unknown, record: Exam) => (
                <Space>
                    <Tooltip title="عرض التفاصيل">
                        <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/exams/${record.id}`)} />
                    </Tooltip>
                    <Tooltip title="تعديل">
                        <Button type="text" icon={<EditOutlined />} onClick={() => { setSelectedExam(record); setEditModalVisible(true); }} />
                    </Tooltip>
                    <Tooltip title="حذف">
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => { setSelectedExam(record); setDeleteModalVisible(true); }} />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">إدارة الاختبارات</h1>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => setCreateModalVisible(true)}
                >
                    إنشاء اختبار جديد
                </Button>
            </div>

            <div className="search-filter-bar">
                <Input
                    placeholder="البحث عن اختبار..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ maxWidth: 400 }}
                    size="large"
                    allowClear
                />
                <Select
                    placeholder="فلترة حسب النوع"
                    value={filterType || undefined}
                    onChange={(value) => setFilterType(value || '')}
                    allowClear
                    style={{ minWidth: 180 }}
                    size="large"
                    options={[
                        { value: 'LESSON_QUIZ', label: 'اختبار درس' },
                        { value: 'COURSE_QUIZ', label: 'اختبار كورس' },
                        { value: 'CHALLENGE', label: 'تحدي' },
                    ]}
                />
            </div>

            <div className="exams-table-wrapper">
                <Table
                    columns={columns}
                    dataSource={filteredExams}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 1200 }}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `إجمالي ${total} اختبار`,
                    }}
                    className="exams-table"
                    onRow={(record) => ({
                        onDoubleClick: () => navigate(`/exams/${record.id}`),
                        style: { cursor: 'pointer' },
                    })}
                />
            </div>

            <CreateExamModal
                visible={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                onSuccess={() => {
                    setCreateModalVisible(false);
                    fetchExams();
                }}
            />

            {selectedExam && (
                <EditExamModal
                    visible={editModalVisible}
                    exam={selectedExam}
                    onCancel={() => {
                        setEditModalVisible(false);
                        setSelectedExam(null);
                    }}
                    onSuccess={() => {
                        setEditModalVisible(false);
                        setSelectedExam(null);
                        fetchExams();
                    }}
                />
            )}

            <DeleteConfirmModal
                visible={deleteModalVisible}
                title="حذف الاختبار"
                description={`هل أنت متأكد من حذف اختبار "${selectedExam?.title}"?؟ سيتم حذف جميع الأسئلة والمحاولات المرتبطة.`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setDeleteModalVisible(false);
                    setSelectedExam(null);
                }}
            />
        </div>
    );
};

export default ExamsPage;
