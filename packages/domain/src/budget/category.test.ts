import { describe, expect, it } from "vitest";
import { archiveCategory, type Category, unarchiveCategory, updateCategory } from "./category";

const category: Category = {
  id: "c1",
  label: "Courses",
  color: "#4F46E5",
  defaultEnvelopeId: "e1",
  archived: false,
};

describe("archiveCategory", () => {
  it("marks the category as archived", () => {
    expect(archiveCategory(category).archived).toBe(true);
  });

  it("keeps the other fields untouched", () => {
    expect(archiveCategory(category)).toMatchObject({
      label: "Courses",
      color: "#4F46E5",
      defaultEnvelopeId: "e1",
    });
  });
});

describe("unarchiveCategory", () => {
  it("clears the archived flag", () => {
    const archived = archiveCategory(category);
    expect(unarchiveCategory(archived).archived).toBe(false);
  });
});

describe("updateCategory", () => {
  it("replaces label, color and default envelope", () => {
    expect(
      updateCategory(category, { label: "Maison", color: "#000000", defaultEnvelopeId: "e2" }),
    ).toMatchObject({ label: "Maison", color: "#000000", defaultEnvelopeId: "e2" });
  });

  it("can clear the default envelope", () => {
    expect(
      updateCategory(category, {
        label: "Courses",
        color: "#4F46E5",
        defaultEnvelopeId: undefined,
      }),
    ).toMatchObject({ defaultEnvelopeId: undefined });
  });

  it("keeps id and archived untouched", () => {
    expect(
      updateCategory(category, { label: "Maison", color: "#000000", defaultEnvelopeId: "e2" }),
    ).toMatchObject({ id: "c1", archived: false });
  });
});
