export function EmbedActionButton(props: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="studio-embed__button"
      title={props.title}
      aria-label={props.title}
      onPointerDownCapture={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.onClick();
      }}
    >
      {props.label}
    </button>
  );
}
