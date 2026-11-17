import { useState } from "react";

import { EmbedActionButton } from "./EmbedActions";

const IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads";
const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";

type WebFrameProps = {
  url: string;
  title: string;
  onOpen: (
    action: "external" | "simple-browser" | "local-file",
    url: string
  ) => void;
  status?: string;
} & (
  | { local: true; sourceUrl: string }
  | { local?: false; onShowCard: () => void; showCardAction: boolean }
);

export function WebFrame(props: WebFrameProps) {
  const [reloadId, setReloadId] = useState(0);

  return (
    <div className="studio-embed-frame">
      <iframe
        key={`${props.url}-${reloadId}`}
        className="studio-embed-frame__iframe"
        src={props.url}
        title={props.title}
        scrolling="yes"
        sandbox={props.local ? "allow-scripts" : IFRAME_SANDBOX}
        allow={IFRAME_ALLOW}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {props.status && (
        <div className="studio-embed-frame__warning" title={props.status}>
          {props.status}
        </div>
      )}
      <div
        className="studio-embed-frame__toolbar"
        onPointerDownCapture={(event) => event.stopPropagation()}
      >
        <EmbedActionButton
          label="Reload"
          title="Reload embedded page"
          onClick={() => setReloadId((current) => current + 1)}
        />
        {props.local ? (
          <EmbedActionButton
            label="Open file"
            title="Open HTML file in VS Code"
            onClick={() => props.onOpen("local-file", props.sourceUrl)}
          />
        ) : (
          <>
            <EmbedActionButton
              label="Open"
              title="Open in browser"
              onClick={() => props.onOpen("external", props.url)}
            />
            <EmbedActionButton
              label="Simple Browser"
              title="Open in VS Code Simple Browser"
              onClick={() => props.onOpen("simple-browser", props.url)}
            />
          </>
        )}
        {!props.local && props.showCardAction && (
          <EmbedActionButton
            label="Link card"
            title="Show as link card"
            onClick={props.onShowCard}
          />
        )}
      </div>
    </div>
  );
}
