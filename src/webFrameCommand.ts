type ActiveWebFrameEditor = {
  owner: object;
  open: () => Promise<boolean>;
};

let activeWebFrameEditor: ActiveWebFrameEditor | undefined;

export function setActiveWebFrameEditor(
  owner: object,
  open: () => Promise<boolean>
) {
  activeWebFrameEditor = { owner, open };
}

export function clearActiveWebFrameEditor(owner: object) {
  if (activeWebFrameEditor?.owner === owner) {
    activeWebFrameEditor = undefined;
  }
}

export async function activateWebFrameTool() {
  if (!activeWebFrameEditor) {
    return false;
  }
  return activeWebFrameEditor.open();
}
