import { useEffect } from "react";
import type {
  ExcalidrawEmbeddableElement,
  NonDeleted,
} from "@excalidraw/excalidraw/element/types";

import type {
  EmbedCheckResult,
  EmbedMode,
  EmbedSettings,
} from "../../../../src/embedTypes";
import { getEmbedDisplayHost, isLoopbackUrl, validateEmbeddable } from "./url";
import { LinkCard } from "./LinkCard";
import { WebFrame } from "./WebFrame";
import { isLocalHtmlUri } from "../../../../src/localHtmlUri";

export function EmbedRenderer(props: {
  element: NonDeleted<ExcalidrawEmbeddableElement>;
  settings: EmbedSettings;
  checkAvailable: boolean;
  remoteSession: boolean;
  checkResult?: EmbedCheckResult;
  mappedUrl?: string;
  localHtml?: string;
  mapError?: string;
  viewOnly: boolean;
  requestCheck: (url: string) => void;
  requestMap: (url: string, retry?: boolean) => void;
  onOpen: (
    action: "external" | "simple-browser" | "local-file",
    url: string
  ) => void;
  onSetMode: (id: string, mode: EmbedMode) => void;
}) {
  const {
    checkAvailable,
    checkResult,
    element,
    localHtml,
    mapError,
    mappedUrl,
    onOpen,
    onSetMode,
    remoteSession,
    requestCheck,
    requestMap,
    settings,
    viewOnly,
  } = props;
  const url = element.link ?? "";
  const isLocal = isLocalHtmlUri(url);
  const embedMode = element.customData?.embedMode as EmbedMode | undefined;
  const isAllowed = validateEmbeddable(url, settings);
  const needsRemoteMapping = remoteSession && isLoopbackUrl(url);

  useEffect(() => {
    if (
      isAllowed &&
      !isLocal &&
      checkAvailable &&
      settings.detectBlockedSites &&
      !checkResult
    ) {
      requestCheck(url);
    }
  }, [
    isAllowed,
    isLocal,
    checkAvailable,
    checkResult,
    requestCheck,
    settings.detectBlockedSites,
    url,
  ]);

  useEffect(() => {
    const missing = isLocal ? localHtml === undefined : !mappedUrl;
    if ((needsRemoteMapping || isLocal) && missing && !mapError) {
      requestMap(url);
    }
  }, [
    needsRemoteMapping,
    isLocal,
    localHtml,
    mappedUrl,
    mapError,
    requestMap,
    url,
  ]);

  const setMode = (mode: EmbedMode) => onSetMode(element.id, mode);
  const open = (action: "external" | "simple-browser", targetUrl: string) =>
    onOpen(action, targetUrl);

  if (isLocal) {
    if (mapError) {
      return (
        <div className="studio-embed-card">
          <div className="studio-embed-card__title">
            Unable to load local HTML
          </div>
          <div className="studio-embed-card__url">{url}</div>
          <div>{mapError}</div>
          <button
            type="button"
            className="studio-embed__button"
            onClick={() => requestMap(url, true)}
          >
            Retry
          </button>
        </div>
      );
    }
    if (localHtml === undefined) {
      return (
        <div className="studio-embed-frame__status">Loading local HTML…</div>
      );
    }
    return (
      <WebFrame
        url={url}
        title={getEmbedDisplayHost(url)}
        local
        html={localHtml}
        onReload={() => requestMap(url, true)}
        onOpen={onOpen}
      />
    );
  }

  if (!isAllowed) {
    return (
      <LinkCard
        url={url}
        result={{
          url,
          blocked: true,
          title: getEmbedDisplayHost(url),
          error: "This URL is not allowed by the embed domain settings.",
        }}
        viewOnly={viewOnly}
        allowTryFrame={false}
        onOpen={onOpen}
        onSetMode={setMode}
      />
    );
  }

  const shouldShowCard =
    embedMode === "card" ||
    (checkResult?.blocked === true && embedMode !== "frame");
  if (shouldShowCard) {
    return (
      <LinkCard
        url={url}
        result={checkResult}
        viewOnly={viewOnly}
        onOpen={open}
        onSetMode={setMode}
      />
    );
  }

  if (needsRemoteMapping && !mappedUrl && !mapError) {
    return (
      <div className="studio-embed-frame__status">
        Mapping remote localhost…
      </div>
    );
  }

  return (
    <WebFrame
      url={mappedUrl ?? url}
      title={checkResult?.title || getEmbedDisplayHost(url)}
      onOpen={onOpen}
      onShowCard={() => setMode("card")}
      showCardAction={!viewOnly}
      status={
        checkResult?.error ||
        mapError ||
        (checkAvailable && settings.detectBlockedSites && !checkResult
          ? "Checking frame support…"
          : undefined)
      }
    />
  );
}
