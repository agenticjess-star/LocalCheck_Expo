import React from "react";
import { CourtsScreen } from "@/components/CourtsScreen";

// BACKEND NOTE: Courts list → GET /api/v1/courts?lat=&lng=&radius=
// Map markers → GET /api/v1/courts/nearby?lat=&lng=
// Court search → GET /api/v1/courts/search?q=&sport=

export default function ExploreTab() {
  return <CourtsScreen />;
}
