// ============================================================
// FlowAnimation – Animated particles along closed-loop pipe network
// ============================================================

import * as THREE from 'three';
import { COLORS, LAYOUT, PERF } from '../core/constants';

export class FlowAnimation {
  group: THREE.Group;
  private particles: THREE.Points;
  private particleMaterial: THREE.PointsMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  private pathPoints: THREE.Vector3[] = [];
  private isActive = false;
  private particleCount: number;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'FlowParticles';

    this.particleCount = Math.min(PERF.MAX_PARTICLES, 160);

    this.rebuildPath(
      new THREE.Vector3(LAYOUT.PUMP_POSITION.x, LAYOUT.PUMP_POSITION.y, LAYOUT.PUMP_POSITION.z),
      new THREE.Vector3(LAYOUT.VALVE_POSITION.x, LAYOUT.VALVE_POSITION.y, LAYOUT.VALVE_POSITION.z),
      new THREE.Vector3(LAYOUT.TANK_POSITION.x, LAYOUT.TANK_POSITION.y, LAYOUT.TANK_POSITION.z)
    );

    // Create particles
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      color: COLORS.LIQUID_SURFACE,
      size: 0.009,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geometry, this.particleMaterial);
    this.particles.visible = false;
    this.group.add(this.particles);

    // Initialize random positions along path
    this.initParticles();
  }

  rebuildPath(pumpPos: THREE.Vector3, _valvePos: THREE.Vector3, tankPos: THREE.Vector3): void {
    const suctionY = 0.04;
    const tankDrainX = tankPos.x + LAYOUT.TANK_RADIUS;
    const pumpInletX = pumpPos.x - 0.068;
    const riserX = pumpPos.x - 0.025;
    const riserStartY = pumpPos.y + 0.062;
    const overheadY = LAYOUT.TANK_HEIGHT + 0.08;
    const tankInletX = tankPos.x;
    const tankInletY = LAYOUT.TANK_HEIGHT + 0.02;

    this.pathPoints = [
      new THREE.Vector3(tankDrainX, suctionY, tankPos.z),
      new THREE.Vector3(pumpInletX, suctionY, pumpPos.z),
      new THREE.Vector3(riserX, riserStartY, pumpPos.z),
      new THREE.Vector3(riserX, overheadY, pumpPos.z),
      new THREE.Vector3(tankInletX, overheadY, tankPos.z),
      new THREE.Vector3(tankInletX, tankInletY, tankPos.z),
    ];
  }

  private initParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      this.velocities[i] = Math.random();
      this.updateParticlePosition(i, this.velocities[i]);
    }
  }

  private updateParticlePosition(index: number, t: number): void {
    if (this.pathPoints.length < 2) return;
    const totalSegments = this.pathPoints.length - 1;
    const segmentT = t * totalSegments;
    const segIndex = Math.min(Math.floor(segmentT), totalSegments - 1);
    const localT = segmentT - segIndex;

    const p0 = this.pathPoints[segIndex];
    const p1 = this.pathPoints[segIndex + 1];

    const i3 = index * 3;
    this.positions[i3] = p0.x + (p1.x - p0.x) * localT;
    this.positions[i3 + 1] = p0.y + (p1.y - p0.y) * localT;
    this.positions[i3 + 2] = p0.z + (p1.z - p0.z) * localT;
  }

  setActive(active: boolean): void {
    this.isActive = active;
    this.particles.visible = active;
  }

  update(dt: number): void {
    if (!this.isActive) return;

    const speed = dt * 0.35;
    for (let i = 0; i < this.particleCount; i++) {
      this.velocities[i] += speed;
      if (this.velocities[i] > 1) {
        this.velocities[i] -= 1;
      }
      this.updateParticlePosition(i, this.velocities[i]);
    }

    (this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
