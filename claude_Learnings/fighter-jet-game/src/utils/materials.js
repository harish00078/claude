import * as THREE from 'three'

// Player jet materials
export function createJetMaterials() {
  return {
    body: new THREE.MeshStandardMaterial({
      color: 0x3a6ea5,
      metalness: 0.7,
      roughness: 0.3,
      flatShading: true
    }),
    canopy: new THREE.MeshPhysicalMaterial({
      color: 0x88c0ff,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.8,
      thickness: 0.5,
      transparent: true,
      opacity: 0.6,
      flatShading: true
    }),
    dark: new THREE.MeshStandardMaterial({
      color: 0x1a2a3a,
      metalness: 0.5,
      roughness: 0.5,
      flatShading: true
    }),
    engine: new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.2,
      flatShading: true,
      emissive: 0xff4400,
      emissiveIntensity: 0.2
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0xff6b35,
      metalness: 0.3,
      roughness: 0.7,
      flatShading: true
    })
  }
}

// Enemy materials by type
export function createDroneMaterials() {
  return {
    body: new THREE.MeshStandardMaterial({
      color: 0xcc3333,
      metalness: 0.4,
      roughness: 0.6,
      flatShading: true,
      emissive: 0x330000,
      emissiveIntensity: 0.2
    }),
    wing: new THREE.MeshStandardMaterial({
      color: 0xaa2222,
      metalness: 0.3,
      roughness: 0.7,
      flatShading: true
    })
  }
}

export function createInterceptorMaterials() {
  return {
    body: new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      metalness: 0.6,
      roughness: 0.4,
      flatShading: true,
      emissive: 0x442200,
      emissiveIntensity: 0.3
    }),
    wing: new THREE.MeshStandardMaterial({
      color: 0xcc8800,
      metalness: 0.4,
      roughness: 0.5,
      flatShading: true
    }),
    fin: new THREE.MeshStandardMaterial({
      color: 0xee9900,
      metalness: 0.5,
      roughness: 0.5,
      flatShading: true
    })
  }
}

export function createBomberMaterials() {
  return {
    body: new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.5,
      roughness: 0.5,
      flatShading: true
    }),
    wing: new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.4,
      roughness: 0.6,
      flatShading: true
    }),
    bay: new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.3,
      roughness: 0.8,
      flatShading: true
    })
  }
}

export function createAceMaterials() {
  return {
    body: new THREE.MeshStandardMaterial({
      color: 0x8800ff,
      metalness: 0.7,
      roughness: 0.3,
      flatShading: true,
      emissive: 0x220044,
      emissiveIntensity: 0.4
    }),
    canopy: new THREE.MeshPhysicalMaterial({
      color: 0xaa44ff,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.7,
      thickness: 0.5,
      transparent: true,
      opacity: 0.5,
      flatShading: true
    }),
    wing: new THREE.MeshStandardMaterial({
      color: 0x6600cc,
      metalness: 0.5,
      roughness: 0.4,
      flatShading: true
    })
  }
}

export function getEnemyMaterials(type) {
  switch (type) {
    case 'drone': return createDroneMaterials()
    case 'interceptor': return createInterceptorMaterials()
    case 'bomber': return createBomberMaterials()
    case 'ace': return createAceMaterials()
    default: return createDroneMaterials()
  }
}

// Projectile materials
export function createPlayerBulletMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0xffdd00,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  })
}

export function createEnemyBulletMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0xff3333,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  })
}

export function createMissileMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xff4444,
    metalness: 0.5,
    roughness: 0.5,
    emissive: 0xff2222,
    emissiveIntensity: 0.5,
    flatShading: true
  })
}

// Particle materials
export function createExplosionParticleMaterial() {
  return new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  })
}

export function createSparkParticleMaterial() {
  return new THREE.PointsMaterial({
    size: 0.15,
    color: 0xffff00,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  })
}

export function createSmokeParticleMaterial() {
  return new THREE.PointsMaterial({
    size: 1,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true
  })
}

// Trail material
export function createTrailMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  })
}

// Muzzle flash material
export function createMuzzleFlashMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0xffff88,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  })
}

// Starfield material
export function createStarfieldMaterial() {
  return new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    sizeAttenuation: true
  })
}

// Terrain material
export function createTerrainMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x1a3a2a,
    metalness: 0,
    roughness: 0.9,
    flatShading: true,
    side: THREE.DoubleSide
  })
}

// Sky gradient (used as background via shader or plane)
export function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x051020) },
      bottomColor: { value: new THREE.Color(0x1a3a5c) },
      horizonColor: { value: new THREE.Color(0xff6b35) },
      sunDirection: { value: new THREE.Vector3(0.5, 0.5, -0.7).normalize() }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDirection;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        float sun = max(0.0, dot(normalize(vWorldPosition), sunDirection));
        vec3 color = mix(bottomColor, topColor, max(0.0, h * 2.0));
        color += horizonColor * smoothstep(0.0, 0.1, h) * 0.5;
        color += vec3(1.0, 0.6, 0.2) * pow(sun, 32.0) * 0.3;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false
  })
}

// Post-processing helper - vignette
export function createVignetteMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      intensity: { value: 0.5 },
      radius: { value: 0.8 },
      softness: { value: 0.4 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float intensity;
      uniform float radius;
      uniform float softness;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        vec2 center = vUv - 0.5;
        float dist = length(center) * 2.0;
        float vignette = smoothstep(radius, radius - softness, dist);
        color.rgb *= mix(1.0, 1.0 - intensity, vignette);
        gl_FragColor = color;
      }
    `,
    depthWrite: false
  })
}