import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  FileText,
  Download,
  Eye,
  Trash2,
  FileDown,
  FileUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  FileCode,
  FileImage
} from "lucide-react";
import {
  generateHtmlReport,
  generatePdfReport,
  getDocuments,
  getDocumentStats,
  getDocumentDownloadUrl,
  getDocumentPreviewUrl,
  deleteDocument,
  type DocumentInfo
} from "../../utils/backend-api";

interface DocumentationProps {
  testId?: string;
  testName?: string;
}

interface DocumentStats {
  total: number;
  html: number;
  pdf: number;
  totalSize: number;
  recentDocuments: DocumentInfo[];
}

export function Documentation({ testId, testName }: DocumentationProps) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 문서 목록 로드
  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getDocuments(testId);
      if (response.success && response.data) {
        setDocuments(response.data);
      } else {
        setError(response.error || '문서 목록을 불러오는데 실패했습니다.');
      }
    } catch (error: any) {
      setError(error.message || '문서 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 통계 로드
  const loadStats = async () => {
    try {
      const response = await getDocumentStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('통계 로드 실패:', error);
    }
  };

  // 초기 로드
  useEffect(() => {
    loadDocuments();
    loadStats();
  }, [testId]);

  // HTML 리포트 생성
  const handleGenerateHtml = async () => {
    if (!testId) {
      setError('테스트 ID가 필요합니다.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);

      const response = await generateHtmlReport(testId);
      if (response.success && response.data) {
        setSuccess('HTML 리포트가 생성되었습니다.');
        await loadDocuments();
        await loadStats();
      } else {
        setError(response.error || 'HTML 리포트 생성에 실패했습니다.');
      }
    } catch (error: any) {
      setError(error.message || 'HTML 리포트 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  // PDF 리포트 생성
  const handleGeneratePdf = async () => {
    if (!testId) {
      setError('테스트 ID가 필요합니다.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);

      const response = await generatePdfReport(testId);
      if (response.success && response.data) {
        setSuccess('PDF 리포트가 생성되었습니다.');
        await loadDocuments();
        await loadStats();
      } else {
        setError(response.error || 'PDF 리포트 생성에 실패했습니다.');
      }
    } catch (error: any) {
      setError(error.message || 'PDF 리포트 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  // 문서 다운로드
  const handleDownload = async (doc: DocumentInfo) => {
    try {
      console.log('문서 다운로드 시작:', doc);
      
      // 다운로드 버튼 비활성화
      const downloadButton = document.querySelector(`[data-document-id="${doc.id}"]`);
      if (downloadButton) {
        downloadButton.setAttribute('disabled', 'true');
        downloadButton.innerHTML = '<div class="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2"></div>다운로드 중...';
      }
      
      const url = getDocumentDownloadUrl(doc.id);
      console.log('다운로드 URL:', url);
      
      // fetch를 사용하여 파일 다운로드 상태 확인
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`다운로드 실패: ${response.status} ${response.statusText}`);
      }
      
      // 파일 내용을 blob으로 변환
      const blob = await response.blob();
      
      // 다운로드 링크 생성 및 클릭
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = doc.filename;
      link.target = '_blank';
      
      // 링크를 DOM에 추가하고 클릭
      document.body.appendChild(link);
      link.click();
      
      // 정리
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      // 성공 메시지
      setSuccess(`${doc.type.toUpperCase()} 문서가 다운로드되었습니다.`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('문서 다운로드 오류:', error);
      
      // 사용자에게 구체적인 에러 메시지 표시
      let errorMessage = '문서 다운로드에 실패했습니다.';
      
      if (error.message.includes('404')) {
        errorMessage = '문서를 찾을 수 없습니다. 문서가 삭제되었거나 이동되었을 수 있습니다.';
      } else if (error.message.includes('403')) {
        errorMessage = '문서에 접근할 권한이 없습니다.';
      } else if (error.message.includes('500')) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.';
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
      
    } finally {
      // 다운로드 버튼 상태 복원
      const downloadButton = document.querySelector(`[data-document-id="${doc.id}"]`);
      if (downloadButton) {
        downloadButton.removeAttribute('disabled');
        downloadButton.innerHTML = '<Download className="h-3 w-3" />';
      }
    }
  };

  // 문서 미리보기
  const handlePreview = (document: DocumentInfo) => {
    if (document.type === 'html') {
      const url = getDocumentPreviewUrl(document.id);
      window.open(url, '_blank');
    } else {
      setError('PDF 문서는 미리보기를 지원하지 않습니다.');
    }
  };

  // 문서 삭제
  const handleDelete = async (documentId: string) => {
    if (!confirm('정말로 이 문서를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await deleteDocument(documentId);
      if (response.success) {
        setSuccess('문서가 삭제되었습니다.');
        await loadDocuments();
        await loadStats();
      } else {
        setError(response.error || '문서 삭제에 실패했습니다.');
      }
    } catch (error: any) {
      setError(error.message || '문서 삭제에 실패했습니다.');
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">문서화</h2>
          <p className="text-gray-600">
            테스트 결과를 HTML 또는 PDF 리포트로 생성하고 관리합니다.
          </p>
        </div>
      </div>

      {/* 알림 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 문서</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">HTML 문서</CardTitle>
              <FileCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.html}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PDF 문서</CardTitle>
              <FileImage className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pdf}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 크기</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 리포트 생성 */}
      {testId && (
        <Card>
          <CardHeader>
            <CardTitle>리포트 생성</CardTitle>
            <CardDescription>
              {testName ? `${testName} 테스트 결과` : '테스트 결과'}를 기반으로 리포트를 생성합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={handleGenerateHtml}
                disabled={generating}
                className="flex items-center gap-2"
              >
                <FileCode className="h-4 w-4" />
                HTML 리포트 생성
                {generating && <Clock className="h-4 w-4 animate-spin" />}
              </Button>

              <Button
                onClick={handleGeneratePdf}
                disabled={generating}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileImage className="h-4 w-4" />
                PDF 리포트 생성
                {generating && <Clock className="h-4 w-4 animate-spin" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 문서 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>문서 목록</CardTitle>
          <CardDescription>
            생성된 리포트 목록입니다. 다운로드, 미리보기, 삭제가 가능합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Clock className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">문서 목록을 불러오는 중...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              생성된 문서가 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>파일명</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>크기</TableHead>
                  <TableHead>생성일</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">
                      {document.filename}
                    </TableCell>
                    <TableCell>
                      <Badge variant={document.type === 'html' ? 'default' : 'secondary'}>
                        {document.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(document.size)}</TableCell>
                    <TableCell>{formatDate(document.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(document)}
                          data-document-id={document.id}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        
                        {document.type === 'html' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreview(document)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(document.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 