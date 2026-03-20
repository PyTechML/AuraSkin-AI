export const USER_ROUTES = {
  REPORTS: "/user/reports",
  REPORT_BY_ID: "/user/reports/:id",
  REPORT_BY_ASSESSMENT: "/user/reports/by-assessment/:assessmentId",
  ORDERS: "/user/orders",
  ORDER_BY_ID: "/user/orders/:id",
  ASSESSMENT: "/user/assessment",
  ASSESSMENT_UPLOAD: "/user/assessment/upload",
  ASSESSMENT_SUBMIT: "/user/assessment/submit",
  ASSESSMENT_PROGRESS: "/user/assessment/progress/:id",
} as const;
