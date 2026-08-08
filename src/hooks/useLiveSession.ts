import { useEffect, useState } from "react";
import { getStatus, subscribe, type LiveStatus } from "../sync/liveSession";

export function useLiveSession(): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>(getStatus());
  useEffect(() => subscribe(setStatus), []);
  return status;
}
