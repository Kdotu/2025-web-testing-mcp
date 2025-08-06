#!/usr/bin/env python3
"""
k6 MCP 서버 테스트 스크립트
"""

import json
import subprocess
import sys
from pathlib import Path

def test_k6_server():
    """k6 MCP 서버를 테스트합니다."""
    
    # 먼저 k6 설치 상태 확인
    print("=== k6 설치 상태 확인 ===")
    check_request = {
        "method": "check_k6_installation",
        "params": {}
    }
    
    try:
        k6_server_path = Path(__file__).parent / "k6_server.py"
        
        # k6 설치 상태 확인
        result = subprocess.run(
            [sys.executable, str(k6_server_path)],
            input=json.dumps(check_request) + "\n",
            capture_output=True,
            text=True,
            timeout=10
        )
        
        print(f"설치 상태 확인 결과:")
        print(f"반환 코드: {result.returncode}")
        print(f"표준 출력: {result.stdout}")
        print(f"표준 오류: {result.stderr}")
        
        if result.returncode == 0:
            try:
                response = json.loads(result.stdout.strip())
                print(f"설치 상태: {response.get('result', 'Unknown')}")
            except json.JSONDecodeError:
                print("설치 상태 확인 실패")
        else:
            print("k6 설치 상태 확인 실패")
            
    except subprocess.TimeoutExpired:
        print("k6 설치 상태 확인 시간 초과")
    except Exception as e:
        print(f"설치 상태 확인 오류: {e}")
    
    print("\n=== k6 테스트 실행 ===")
    
    # 테스트용 간단한 k6 스크립트 생성
    test_script = """
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const response = http.get('https://httpbin.org/get');
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
"""
    
    # 임시 스크립트 파일 생성
    script_path = Path("/tmp/test_k6_script.js")
    script_path.write_text(test_script)
    
    print(f"테스트 스크립트 생성: {script_path}")
    
    # k6 MCP 서버에 요청 전송
    request = {
        "method": "execute_k6_test",
        "params": {
            "script_file": str(script_path),
            "duration": "5s",
            "vus": 1
        }
    }
    
    print(f"요청 전송: {json.dumps(request, indent=2)}")
    
    try:
        # 서버에 JSON 요청 전송
        result = subprocess.run(
            [sys.executable, str(k6_server_path)],
            input=json.dumps(request) + "\n",
            capture_output=True,
            text=True,
            timeout=30
        )
        
        print(f"반환 코드: {result.returncode}")
        print(f"표준 출력: {result.stdout}")
        print(f"표준 오류: {result.stderr}")
        
        if result.returncode == 0:
            try:
                response = json.loads(result.stdout.strip())
                print(f"응답: {json.dumps(response, indent=2)}")
            except json.JSONDecodeError:
                print("JSON 응답 파싱 실패")
        else:
            print("k6 서버 실행 실패")
            
    except subprocess.TimeoutExpired:
        print("k6 서버 실행 시간 초과")
    except Exception as e:
        print(f"오류 발생: {e}")
    finally:
        # 임시 파일 정리
        if script_path.exists():
            script_path.unlink()

if __name__ == "__main__":
    test_k6_server() 