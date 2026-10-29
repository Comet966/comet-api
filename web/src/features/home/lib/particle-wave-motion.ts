/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
/** Critically damped motion, integrated analytically for variable frame times. */
class WaveSpring {
  value = 0
  velocity = 0

  step(target: number, seconds: number, frequency: number) {
    const offset = this.value - target
    const impulse = (this.velocity + frequency * offset) * seconds
    const decay = Math.exp(-frequency * seconds)
    this.value = target + (offset + impulse) * decay
    this.velocity = (this.velocity - frequency * impulse) * decay
    return this.value
  }
}

interface WaveTrail {
  x: number
  y: number
  directionX: number
  directionY: number
  power: number
  age: number
}

interface ParticleMotion {
  x: WaveSpring
  y: WaveSpring
  light: WaveSpring
}

/** Local visual state only. Cursor history gives the surface a short, fading wake. */
export class ParticleWaveMotion {
  phase = 0
  private pointerX = new WaveSpring()
  private pointerY = new WaveSpring()
  private targetX = 0
  private targetY = 0
  private active = false
  private strength = 0
  private trailClock = 0
  private trails: WaveTrail[] = []
  private particles: ParticleMotion[] = []

  move(x: number, y: number) {
    if (!this.active && this.strength < 0.01) {
      this.pointerX.value = x
      this.pointerY.value = y
      this.pointerX.velocity = 0
      this.pointerY.velocity = 0
    }
    this.targetX = x
    this.targetY = y
    this.active = true
  }

  release() {
    this.active = false
  }

  reset(staticWave: boolean) {
    if (staticWave) this.phase = 0
    this.active = false
    this.strength = 0
    this.trailClock = 0
    this.trails = []
    this.particles = []
    this.pointerX.velocity = 0
    this.pointerY.velocity = 0
  }

  advance(seconds: number) {
    if (seconds <= 0) return
    this.phase += seconds * 0.3
    const oldX = this.pointerX.value
    const oldY = this.pointerY.value
    this.pointerX.step(this.targetX, seconds, 13)
    this.pointerY.step(this.targetY, seconds, 13)
    const response = this.active ? 0.18 : 0.45
    this.strength +=
      ((this.active ? 1 : 0) - this.strength) *
      (1 - Math.exp(-seconds / response))

    this.trails = this.trails.filter((trail) => {
      trail.age += seconds
      return trail.age < 1.35
    })
    const dx = this.pointerX.value - oldX
    const dy = this.pointerY.value - oldY
    const distance = Math.hypot(dx, dy)
    this.trailClock += seconds
    if (this.active && this.trailClock >= 1 / 40 && distance / seconds > 30) {
      this.trails.push({
        x: this.pointerX.value,
        y: this.pointerY.value,
        directionX: dx / distance,
        directionY: dy / distance,
        power: Math.min(1, distance / seconds / 900) * this.strength,
        age: 0,
      })
      // Bound both work and lingering motion independently of event frequency.
      if (this.trails.length > 24) this.trails.shift()
      this.trailClock %= 1 / 40
    }
  }

  deform(
    index: number,
    x: number,
    y: number,
    perspective: number,
    seconds: number,
    reach: number
  ) {
    const particle = (this.particles[index] ??= {
      x: new WaveSpring(),
      y: new WaveSpring(),
      light: new WaveSpring(),
    })
    const dx = (x - this.pointerX.value) / reach
    const dy = (y - this.pointerY.value) / reach
    const influence = Math.exp(-(dx * dx + dy * dy) * 1.6) * this.strength
    // A broad, continuous lift replaces the old direction-normalized repulsion.
    // No singularity at the cursor, and each particle retains its own velocity.
    let targetX = dx * influence * 16
    let targetY = -influence * 34 * (0.7 + perspective * 0.3)
    for (const trail of this.trails) {
      const progress = trail.age / 1.35
      const radius = reach * (0.55 + progress * 0.65)
      const distance = Math.hypot(x - trail.x, y - trail.y) / radius
      const envelope = Math.sin(Math.PI * progress) ** 2
      const wake = Math.exp(-distance * distance * 2) * envelope * trail.power
      targetX += trail.directionX * wake * 4
      targetY +=
        (trail.directionY * 3 +
          Math.sin(progress * Math.PI * 2 - distance * 2) * 8) *
        wake
    }
    const offsetX = particle.x.step(Math.tanh(targetX / 36) * 36, seconds, 10)
    const offsetY = particle.y.step(Math.tanh(targetY / 58) * 58, seconds, 10)
    const light = particle.light.step(influence, seconds, 8)
    return { x: x + offsetX, y: y + offsetY, light }
  }
}
