const MESSAGE = " [ new drop expected Q4 2k27 ] [ updates on ig and in blog ] ";

/* Repeats per half of the track; six copies make one half wider than any
   viewport, so translating the track by -50% loops seamlessly. */
const REPEATS = 6;

/**
 * A CRT-style running sign between the manifesto and the archive. Inverted
 * against the active theme; the dot-matrix lettering and scroll are pure CSS.
 */
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
