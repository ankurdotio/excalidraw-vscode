import type { EmbedCheckResult, EmbedMode } from "../../../../src/embedTypes";
import { getEmbedDisplayHost } from "./url";
import { EmbedActionButton } from "./EmbedActions";

export function LinkCard(props: {
  url: string;
  result?: EmbedCheckResult;
  viewOnly: boolean;
  allowTryFrame?: boolean;
  onOpen: (action: "external" | "simple-browser", url: string) => void;
  onSetMode: (mode: EmbedMode) => void;
}) {
  const title = props.result?.title || getEmbedDisplayHost(props.url);

  return (
    <div className="studio-embed-card">
      <div className="studio-embed-card__heading">
        {props.result?.favicon && (
          <img
            className="studio-embed-card__favicon"
            src={props.result.favicon}
            alt=""
          />
        )}
        <div className="studio-embed-card__title" title={title}>
          {title}
        </div>
      </div>
      <div className="studio-embed-card__url" title={props.url}>
        {props.url}
      </div>
      {props.result?.error && (
        <div className="studio-embed-card__status">
          Could not check frame policy: {props.result.error}
        </div>
      )}
      <div className="studio-embed-card__actions">
        <EmbedActionButton
          label="Open in browser"
          title="Open in browser"
          onClick={() => props.onOpen("external", props.url)}
        />
        <EmbedActionButton
          label="Simple Browser"
          title="Open in VS Code Simple Browser"
          onClick={() => props.onOpen("simple-browser", props.url)}
        />
        {!props.viewOnly && props.allowTryFrame !== false && (
          <EmbedActionButton
            label={
              props.result?.blocked ? "Try embedding anyway" : "Show frame"
            }
            title={
              props.result?.blocked ? "Try embedding anyway" : "Show frame"
            }
            onClick={() => props.onSetMode("frame")}
          />
        )}
      </div>
    </div>
  );
}
