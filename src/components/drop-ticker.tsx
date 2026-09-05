const MESSAGE = " [ new drop expected Q4 2k27 ] [ updates on ig and in blog ] ";
const REPEATS = 6;

export default function DropTicker() {
  const group = (
    <span className="ticker__group" aria-hidden="true">
      {Array.from({ length: REPEATS }, (_, i) => (
        <span className="ticker__text" key={i}>
          {MESSAGE}
        </span>
      ))}
    </span>
  );

  return (
    <div className="ticker">
      <span className="sr-only">
        New drop expected Q4 2k27. Updates on Instagram and in the blog.
      </span>
      <div className="ticker__track">
        {group}
        {group}
      </div>
    </div>
  );
}
