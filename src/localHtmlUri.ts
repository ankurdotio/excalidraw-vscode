export function isLocalHtmlUri(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "file:" || url.protocol === "vscode-remote:") &&
      url.pathname.startsWith("/") &&
      /\.html?$/i.test(url.pathname) &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}
