export function WebGLErrorState() {
  return (
    <div className="fatal-state">
      <div className="fatal-card">
        <h1 className="fatal-title">3D isn't available in this browser</h1>
        <p className="fatal-text">
          This demo needs WebGL to render the scene. Your browser may not support it, or
          hardware acceleration may be turned off in its settings. Trying a current version of
          Chrome, Firefox, Edge, or Safari usually fixes this.
        </p>
        <p className="fatal-text">The rest of the portfolio works without WebGL.</p>
      </div>
    </div>
  );
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}
