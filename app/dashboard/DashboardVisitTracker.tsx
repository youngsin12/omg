"use client";

import { useEffect } from "react";
import { trackProductEvent } from "../lib/analytics/client";

export default function DashboardVisitTracker() {
  useEffect(() => {
    void trackProductEvent("dashboard_visited");
  }, []);

  return null;
}
