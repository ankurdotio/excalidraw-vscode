export function toLocalHtmlUri(value: string): string | undefined {
  let uri = value;
  if (/^\/(?!\/)/.test(value) || /^[a-z]:[\\/]/i.test(value)) {
    const localPath = value.replace(/\\/g, "/");
    uri = `file://${localPath.startsWith("/") ? "" : "/"}${localPath
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")}`;
  }
  try {
    const url = new URL(uri);
    if (
      (url.protocol === "file:" || url.protocol === "vscode-remote:") &&
      url.pathname.startsWith("/") &&
      /\.html?$/i.test(url.pathname) &&
      !url.search &&
      !url.hash
    ) {
      return uri;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function isLocalHtmlUri(value: string): boolean {
  return toLocalHtmlUri(value) !== undefined;
}
