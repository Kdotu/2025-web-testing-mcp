from typing import Any
import subprocess
from pathlib import Path
import sys
import json
import os

# Environment variables are already available in the process environment

def run_k6_script(script_file: str, duration: str = "30s", vus: int = 10) -> str:
    """Run a k6 load test script.

    Args:
        script_file: Path to the k6 test script (.js)
        duration: Duration of the test (e.g., "30s", "1m", "5m")
        vus: Number of virtual users to simulate

    Returns:
        str: k6 execution output
    """
    try:
        # Convert to absolute path
        script_file_path = Path(script_file).resolve()
        
        # Validate file exists and is a .js file
        if not script_file_path.exists():
            return f"Error: Script file not found: {script_file}"
        if not script_file_path.suffix == '.js':
            return f"Error: Invalid file type. Expected .js file: {script_file}"

        # Get k6 binary path from environment
        k6_bin = os.getenv('K6_BIN', 'k6')
        
        # Print the k6 binary path for debugging
        print(f"k6 binary path: {k6_bin}", file=sys.stderr)

        # Build command
        cmd = [k6_bin]
        cmd.extend(['run'])
        cmd.extend(['-d', duration])
        cmd.extend(['-u', str(vus)])
        cmd.extend([str(script_file_path)])

        print(f"Executing command: {' '.join(cmd)}", file=sys.stderr)
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
        
        # Print output for debugging
        print(f"\nCommand output:", file=sys.stderr)
        print(f"Return code: {result.returncode}", file=sys.stderr)
        print(f"Stdout: {result.stdout}", file=sys.stderr)
        print(f"Stderr: {result.stderr}", file=sys.stderr)

        if result.returncode != 0:
            return f"Error executing k6 test:\n{result.stderr}"
        
        return result.stdout

    except Exception as e:
        return f"Unexpected error: {str(e)}"

def execute_k6_test(script_file: str, duration: str = "30s", vus: int = 10) -> str:
    """Execute a k6 load test.

    Args:
        script_file: Path to the k6 test script (.js)
        duration: Duration of the test (e.g., "30s", "1m", "5m")
        vus: Number of virtual users to simulate
    """
    return run_k6_script(script_file, duration, vus)

def execute_k6_test_with_options(script_file: str, duration: str, vus: int) -> str:
    """Execute a k6 load test with custom duration and VUs.

    Args:
        script_file: Path to the k6 test script (.js)
        duration: Duration of the test (e.g., "30s", "1m", "5m")
        vus: Number of virtual users to simulate
    """
    return run_k6_script(script_file, duration, vus)

def main():
    """1회성 실행 방식의 메인 함수"""
    try:
        # 표준 입력에서 JSON 요청 읽기
        request_line = sys.stdin.readline().strip()
        if not request_line:
            print(json.dumps({"error": "No request received"}), file=sys.stderr)
            sys.exit(1)
        
        # 디버깅을 위한 환경 정보 출력
        print(f"Python version: {sys.version}", file=sys.stderr)
        print(f"Current working directory: {os.getcwd()}", file=sys.stderr)
        print(f"K6_BIN environment: {os.getenv('K6_BIN', 'not set')}", file=sys.stderr)
        
        # JSON 파싱
        request = json.loads(request_line)
        method = request.get('method')
        params = request.get('params', {})
        
        print(f"Received request: {method}", file=sys.stderr)
        print(f"Params: {params}", file=sys.stderr)
        
        # 메서드에 따른 실행
        if method == 'execute_k6_test':
            script_file = params.get('script_file')
            duration = params.get('duration', '30s')
            vus = params.get('vus', 10)
            
            result = execute_k6_test(script_file, duration, vus)
            print(json.dumps({"result": result}))
            
        elif method == 'execute_k6_test_with_options':
            script_file = params.get('script_file')
            duration = params.get('duration')
            vus = params.get('vus')
            
            result = execute_k6_test_with_options(script_file, duration, vus)
            print(json.dumps({"result": result}))
            
        else:
            error_msg = f"Unknown method: {method}"
            print(json.dumps({"error": error_msg}), file=sys.stderr)
            sys.exit(1)
            
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Unexpected error: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 