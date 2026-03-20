# Observability alert definitions

Use these in Grafana (Alerting → Alert rules) or Prometheus alerting. Configure a contact point (email / Slack / webhook) and attach to each rule.

## 1. API latency > 500ms

- **Condition:** API p95 latency above 500ms for 5 minutes.
- **Prometheus / Grafana expression:**
  ```promql
  histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 0.5
  ```
- **Action:** Send alert to admin.

## 2. AI processing time > 10 seconds

- **Condition:** AI job p95 processing time above 10s for 5 minutes.
- **Expression:**
  ```promql
  histogram_quantile(0.95, sum(rate(ai_processing_time_seconds_bucket[5m])) by (le)) > 10
  ```
- **Action:** Send alert to admin.

## 3. Payment failure rate > 5%

- **Condition:** Payment webhook failure rate above 5% over a 1h window. Adjust denominator if you have a dedicated payment-request counter.
- **Expression (example – webhook failures per hour):**
  ```promql
  increase(payment_webhook_failures_total[1h]) > 0 and rate(payment_webhook_failures_total[1h]) / (rate(payment_webhook_failures_total[1h]) + 0.001) > 0.05
  ```
  Or simpler: fire when there are any webhook failures in the last hour and you want to be notified:
  ```promql
  increase(payment_webhook_failures_total[1h]) > 0
  ```
- **Action:** Send alert to admin.

## 4. Consultation connection failures > 3%

- **Condition:** Consultation connection failure rate above 3%.
- **Expression (failures vs total connection attempts – approximate):**
  ```promql
  rate(consultation_connection_failures_total[5m]) > 0.03 * (rate(websocket_connections_active[5m]) + rate(consultation_connection_failures_total[5m]))
  ```
  Or fire when failure rate is high:
  ```promql
  rate(consultation_connection_failures_total[5m]) > 0.01
  ```
- **Action:** Send alert to admin.

## Contact point

In Grafana: Alerting → Contact points → New contact point. Choose Email, Slack, or Webhook and set “Send to admin” as the destination. Attach the contact point to the above rules.
