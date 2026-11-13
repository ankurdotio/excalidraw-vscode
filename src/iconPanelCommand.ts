type ActiveIconPanel = {
  owner: object;
  toggle: () => Promise<boolean>;
};

let activeIconPanel: ActiveIconPanel | undefined;

export function setActiveIconPanel(
  owner: object,
  toggle: () => Promise<boolean>
) {
  activeIconPanel = { owner, toggle };
}

export function clearActiveIconPanel(owner: object) {
  if (activeIconPanel?.owner === owner) {
    activeIconPanel = undefined;
  }
}

export async function toggleActiveIconPanel() {
  if (!activeIconPanel) {
    return false;
  }
  return activeIconPanel.toggle();
}
