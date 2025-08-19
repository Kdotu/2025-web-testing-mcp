import { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { AlertCircle, TestTube, Activity } from "lucide-react";
import { TestType } from "../../utils/api";

interface BasicTestSettingsProps {
  testUrl: string;
  setTestUrl: (url: string) => void;
  selectedTestType: string;
  setSelectedTestType: (type: string) => void;
  testDescription: string;
  setTestDescription: (description: string) => void;
  testTypes: TestType[];
  mcpTools: string[];
  mcpToolsLoading: boolean;
  isExecuting: boolean;
}

export function BasicTestSettings({
  testUrl,
  setTestUrl,
  selectedTestType,
  setSelectedTestType,
  testDescription,
  setTestDescription,
  testTypes,
  mcpTools,
  mcpToolsLoading,
  isExecuting
}: BasicTestSettingsProps) {
  const [urlError, setUrlError] = useState("");

  // URL 유효성 검사 함수
  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return false;

    try {
      const urlObj = new URL(url);
      // HTTP 또는 HTTPS 프로토콜만 허용
      return (
        urlObj.protocol === "http:" ||
        urlObj.protocol === "https:"
      );
    } catch {
      return false;
    }
  };

  // URL 자동 보정 함수
  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;

    // 프로토콜이 없으면 https:// 추가
    if (!trimmed.match(/^https?:\/\//i)) {
      return `https://${trimmed}`;
    }

    return trimmed;
  };

  // URL 입력 핸들러
  const handleUrlChange = (value: string) => {
    setTestUrl(value);

    // URL 유효성 검사
    if (value && !validateUrl(value)) {
      setUrlError('올바른 URL을 입력해주세요.');
    } else {
      setUrlError('');
    }
  };

  // URL 입력 완료 시 자동 보정
  const handleUrlBlur = () => {
    if (testUrl.trim() && !testUrl.match(/^https?:\/\//i)) {
      const normalized = normalizeUrl(testUrl);
      setTestUrl(normalized);
      if (validateUrl(normalized)) {
        setUrlError("");
      }
    }
  };

  return (
    <div className="neu-card rounded-3xl px-6 py-8">
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-primary mb-4">
          기본 테스트 설정
        </h3>
        <p className="text-muted-foreground text-lg">
          테스트할 웹사이트와 테스트 유형을 선택하세요
        </p>

        {/* 테스트 유형과 활용 MCP 도구 표시 - 항상 표시 */}
        <div className="mt-6">
          {/* 테스트 유형 선택 */}
          <div className="mb-4">
            <div className="flex items-center space-x-3">
              <TestTube className="h-5 w-5 text-primary" />
              <Label className="text-foreground font-semibold text-lg w-28">
                테스트 유형
              </Label>
              <div className="flex gap-2">
                {testTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedTestType(type.id)}
                    disabled={isExecuting}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedTestType === type.id 
                        ? "neu-accent text-primary-foreground" 
                        : "neu-button text-foreground hover:text-primary"
                    } ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* 활용 MCP 도구 표시 */}
          <div className="mb-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-5 w-5 text-primary" />
              <Label className="text-foreground font-semibold text-lg w-28">
                활용 MCP 도구
              </Label>
              {selectedTestType && (
                <div className="flex gap-2">
                  {mcpToolsLoading ? (
                    <div className="neu-pressed rounded-lg px-3 py-2">
                      <Badge
                        variant="secondary"
                        className="font-semibold text-sm bg-transparent border-none text-muted-foreground"
                      >
                        로딩 중...
                      </Badge>
                    </div>
                  ) : (
                    mcpTools.map((tool) => (
                      <div
                        key={tool}
                        className="neu-pressed rounded-lg px-3 py-2"
                      >
                        <Badge
                          variant="secondary"
                          className="font-semibold text-sm bg-transparent border-none text-muted-foreground"
                        >
                          {tool}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="space-y-4">
          <Label className="text-foreground font-semibold text-lg">
            테스트 URL
          </Label>
          <div
            className={`neu-input rounded-xl px-4 py-3 ${urlError ? "border-destructive border-2" : ""}`}
          >
            <Input
              type="url"
              placeholder="https://example.com"
              value={testUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={handleUrlBlur}
              disabled={isExecuting}
              className="border-none bg-transparent text-foreground placeholder:text-muted-foreground"
              pattern="https?://.*"
            />
          </div>
          {urlError && (
            <div className="flex items-start space-x-2 text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{urlError}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Label className="text-foreground font-semibold text-lg">
            테스트 설명 (선택사항)
          </Label>
          <div className="neu-input rounded-xl px-4 py-1">
            <Textarea
              placeholder="이 테스트에 대한 간단한 설명을 입력하세요"
              value={testDescription}
              onChange={(e) => setTestDescription(e.target.value)}
              disabled={isExecuting}
              className="min-h-12 border-none bg-transparent resize-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {selectedTestType && (
          <div className="neu-pressed rounded-xl px-6 py-5">
            <div className="flex items-start space-x-4">
              <AlertCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <p className="text-muted-foreground">
                {
                  testTypes.find(
                    (t) => t.id === selectedTestType,
                  )?.description
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 