export type EmbedResponseHeaders = Record<
  string,
  string | string[] | undefined
>;

export type FrameBlockingReason = "x-frame-options" | "frame-ancestors";

function getHeaderValues(
  headers: EmbedResponseHeaders,
  name: string
): string[] {
  const value = Object.entries(headers).find(
    ([headerName]) => headerName.toLowerCase() === name
  )?.[1];

  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
}

function policyBlocksFraming(policy: string): boolean {
  const directive = policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => /^frame-ancestors(?:\s|$)/i.test(part));

  if (!directive) {
    return false;
  }

  const sources = directive
    .replace(/^frame-ancestors(?:\s+|$)/i, "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return !sources.some(
    (source) => source === "*" || source === "https:" || source === "https://*"
  );
}

export function getFrameBlockingReason(
  headers: EmbedResponseHeaders
): FrameBlockingReason | undefined {
  const contentSecurityPolicies = getHeaderValues(
    headers,
    "content-security-policy"
  ).flatMap((value) => value.split(","));
  const policiesWithFrameAncestors = contentSecurityPolicies.filter((policy) =>
    /(?:^|;)\s*frame-ancestors(?:\s|;|$)/i.test(policy)
  );

  if (policiesWithFrameAncestors.length > 0) {
    return policiesWithFrameAncestors.some(policyBlocksFraming)
      ? "frame-ancestors"
      : undefined;
  }

  const xFrameOptions = getHeaderValues(headers, "x-frame-options")
    .join(",")
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);

  if (
    xFrameOptions.some((value) => value === "deny" || value === "sameorigin")
  ) {
    return "x-frame-options";
  }

  return undefined;
}
