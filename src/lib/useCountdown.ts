import { useEffect, useState } from "react";

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function diff(target: number): Countdown {
  const ms = Math.max(target - Date.now(), 0);
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
    done: ms <= 0,
  };
}

/** Live-ticking countdown to an ISO date string. */
export function useCountdown(iso: string): Countdown {
  const target = new Date(iso).getTime();
  const [state, setState] = useState<Countdown>(() => diff(target));

  useEffect(() => {
    const t = setInterval(() => setState(diff(target)), 1000);
    return () => clearInterval(t);
  }, [target]);

  return state;
}
