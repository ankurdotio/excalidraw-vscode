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

export function EmbedRenderer(props: {
  element: NonDeleted<ExcalidrawEmbeddableElement>;
  settings: EmbedSettings;
  checkAvailable: boolean;
  remoteSession: boolean;
  checkResult?: EmbedCheckResult;
  mappedUrl?: string;
  mapError?: string;
  viewOnly: boolean;
  requestCheck: (url: string) => void;
  requestMap: (url: string) => void;
  onOpen: (action: "external" | "simple-browser", url: string) => void;
  onSetMode: (id: string, mode: EmbedMode) => void;
}) {
  const {
    checkAvailable,
    checkResult,
    element,
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
  const embedMode = element.customData?.embedMode as EmbedMode | undefined;
  const isAllowed = validateEmbeddable(url, settings);
  const needsRemoteMapping = remoteSession && isLoopbackUrl(url);

  useEffect(() => {
    if (
      isAllowed &&
      checkAvailable &&
      settings.detectBlockedSites &&
      !checkResult
    ) {
      requestCheck(url);
    }
  }, [
    isAllowed,
    checkAvailable,
    checkResult,
    requestCheck,
    settings.detectBlockedSites,
    url,
  ]);

  useEffect(() => {
    if (needsRemoteMapping && !mappedUrl && !mapError) {
      requestMap(url);
    }
  }, [needsRemoteMapping, mappedUrl, mapError, requestMap, url]);

  const setMode = (mode: EmbedMode) => onSetMode(element.id, mode);
  const open = (action: "external" | "simple-browser", targetUrl: string) =>
    onOpen(action, targetUrl);

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
        onOpen={open}
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
      onOpen={open}
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
