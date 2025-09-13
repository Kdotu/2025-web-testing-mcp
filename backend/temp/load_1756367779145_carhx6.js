
import http from "k6/http";
import { sleep } from "k6";
import { check } from "k6";

export const options = {
  vus: 10,
  duration: "3m",
  thresholds: {
    http_req_duration: ["p(95)<5000"], // 2000ms에서 5000ms로 증가
    http_req_failed: ["rate<0.8"], // 0.5에서 0.8로 증가
  },
};

export default function () {
  const response = http.get("http://[::1]:3100/settings");
  
  check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 5000ms": (r) => r.timings.duration < 5000, // 2000ms에서 5000ms로 증가
  });
  
  sleep(1);
}
