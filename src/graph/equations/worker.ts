import { sampleEquations } from "./sample";
self.onmessage = (
  event: MessageEvent<{
    expressions: string[];
    min: number;
    max: number;
    yRange: number;
  }>,
) => {
  try {
    self.postMessage({
      ok: true,
      result: sampleEquations(
        event.data.expressions,
        event.data.min,
        event.data.max,
        event.data.yRange,
      ),
    });
  } catch (error) {
    self.postMessage({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to plot these equations.",
    });
  }
};
