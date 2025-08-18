import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '5s', target: 2 },
    { duration: '5s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    'errors': ['rate<0.1']
  }
};

export default function () {
  const response = http.get('https://httpbin.org/get');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(response.status !== 200);
  sleep(1);
} 