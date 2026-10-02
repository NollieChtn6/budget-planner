import { describe, expect, it } from "vitest";
import { archiveCategory, type Category, unarchiveCategory } from "./category";

const category: Category = { id: "c1", label: "Courses", defaultEnvelopeId: "e1", archived: false };

describe("archiveCategory", () => {
  it("marks the category as archived", () => {
    expect(archiveCategory(category).archived).toBe(true);
  });

  it("keeps the other fields untouched", () => {
    expect(archiveCategory(category)).toMatchObject({ label: "Courses", defaultEnvelopeId: "e1" });
  });
});

describe("unarchiveCategory", () => {
  it("clears the archived flag", () => {
    const archived = archiveCategory(category);
    expect(unarchiveCategory(archived).archived).toBe(false);
  });
});
