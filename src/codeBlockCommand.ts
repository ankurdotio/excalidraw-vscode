type ActiveCodeBlockEditor = {
  owner: object;
  open: () => Promise<boolean>;
};

let activeCodeBlockEditor: ActiveCodeBlockEditor | undefined;

export function setActiveCodeBlockEditor(
  owner: object,
  open: () => Promise<boolean>
) {
  activeCodeBlockEditor = { owner, open };
}

export function clearActiveCodeBlockEditor(owner: object) {
  if (activeCodeBlockEditor?.owner === owner) {
    activeCodeBlockEditor = undefined;
  }
}

export async function openCodeBlockEditor() {
  if (!activeCodeBlockEditor) {
    return false;
  }
  return activeCodeBlockEditor.open();
}
