import { describe, expect, it } from "vitest";
import { profileSaveReview, summarizeCapture } from "./review-model";

describe("summarizeCapture", () => {
  it("summarizes the synthetic review without exposing protected values", () => {
    expect(summarizeCapture(profileSaveReview)).toEqual({
      eventCount: 6,
      actorCount: 4,
      typeCount: 5,
      protectedFieldCount: 2,
    });

    expect(JSON.stringify(profileSaveReview)).not.toContain("Bearer");
  });
});
