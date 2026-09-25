// Frame-rate independent damped spring navigation in project-space units.
export function advanceNavigation(state, seconds, idleMilliseconds, maximum) {
  let {position, velocity, target} = state;
  const steps = Math.max(1, Math.ceil(seconds / (1 / 120)));
  const dt = seconds / steps;
  for (let n = 0; n < steps; n++) {
    const snapping = target !== null || (idleMilliseconds > 190 && Math.abs(velocity) < .75);
    if (snapping) velocity += ((target ?? Math.round(position)) - position) * 22 * dt - velocity * 9.5 * dt;
    else velocity *= Math.exp(-3.1 * dt);
    position += velocity * dt;
    if (position < 0 || position > maximum) { position = Math.max(0, Math.min(maximum, position)); velocity = 0; }
    const destination = target ?? Math.round(position);
    if (snapping && Math.abs(destination - position) < .0002 && Math.abs(velocity) < .003) {
      position = destination; velocity = 0; target = null;
    }
  }
  return {position, velocity, target};
}
