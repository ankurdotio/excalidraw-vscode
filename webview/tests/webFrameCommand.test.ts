import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activateWebFrameTool,
  clearActiveWebFrameEditor,
  setActiveWebFrameEditor,
} from "../../src/webFrameCommand";

describe("web frame command", () => {
  const firstOwner = {};
  const secondOwner = {};

  afterEach(() => {
    clearActiveWebFrameEditor(firstOwner);
    clearActiveWebFrameEditor(secondOwner);
  });

  it("only invokes the active editor and ignores cleanup from an older editor", async () => {
    const first = vi.fn().mockResolvedValue(true);
    const second = vi.fn().mockResolvedValue(true);
    setActiveWebFrameEditor(firstOwner, first);
    setActiveWebFrameEditor(secondOwner, second);
    clearActiveWebFrameEditor(firstOwner);

    expect(await activateWebFrameTool()).toBe(true);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    clearActiveWebFrameEditor(secondOwner);
    expect(await activateWebFrameTool()).toBe(false);
  });

  it("propagates failure when the active editor cannot insert a frame", async () => {
    setActiveWebFrameEditor(firstOwner, async () => false);
    expect(await activateWebFrameTool()).toBe(false);
  });
});
