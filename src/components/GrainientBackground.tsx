import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Mesh, Program, Renderer, Triangle } from 'ogl'
import type { PerformanceTier } from '../hooks/useViewportProfile'
import type { MotionProfile, MotionVector } from '../motion/types'
import {
  DEFAULT_GRAINIENT_SETTINGS,
  type GrainientSettings,
} from './grainientTuning'
import './GrainientBackground.css'

interface GrainientBackgroundProps {
  entered: boolean
  reducedMotion: boolean
  motionRef: MutableRefObject<MotionVector>
  className?: string
  timeScale?: number
  motionProfile?: MotionProfile
  performanceTier?: PerformanceTier
  settings?: GrainientSettings
}

const vertexShaderSource = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentShaderSource = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);

  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;

  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);

  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));

  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;

  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);

  o=vec4(col,1.0);
}
void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}
`

function hexToRgb(hex: string): [number, number, number] {
  const parsed = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)

  if (!parsed) {
    return [1, 1, 1]
  }

  return [
    Number.parseInt(parsed[1], 16) / 255,
    Number.parseInt(parsed[2], 16) / 255,
    Number.parseInt(parsed[3], 16) / 255,
  ]
}

function resolveMaxDpr(performanceTier: PerformanceTier) {
  if (performanceTier === 'low') {
    return 1.2
  }

  if (performanceTier === 'medium') {
    return 1.45
  }

  return window.innerWidth <= 768 ? 1.6 : 2
}

export function GrainientBackground({
  entered,
  reducedMotion,
  motionRef,
  className,
  timeScale = 1,
  motionProfile = { x: 1, y: 1 },
  performanceTier = 'high',
  settings = DEFAULT_GRAINIENT_SETTINGS,
}: GrainientBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const timeScaleRef = useRef(timeScale)
  const motionProfileRef = useRef(motionProfile)
  const settingsRef = useRef<GrainientSettings>(settings)
  const colorRef = useRef({
    color1: new Float32Array(hexToRgb(settings.color1)),
    color2: new Float32Array(hexToRgb(settings.color2)),
    color3: new Float32Array(hexToRgb(settings.color3)),
  })

  useEffect(() => {
    timeScaleRef.current = timeScale
  }, [timeScale])

  useEffect(() => {
    motionProfileRef.current = motionProfile
  }, [motionProfile])

  useEffect(() => {
    settingsRef.current = settings
    colorRef.current = {
      color1: new Float32Array(hexToRgb(settings.color1)),
      color2: new Float32Array(hexToRgb(settings.color2)),
      color3: new Float32Array(hexToRgb(settings.color3)),
    }
  }, [settings])

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return undefined
    }

    let renderer: Renderer | null = null
    let rafId = 0
    let resizeObserver: ResizeObserver | null = null
    let detached = false

    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, resolveMaxDpr(performanceTier)),
      })
    } catch {
      return undefined
    }

    const gl = renderer.gl

    if (!gl || !gl.canvas) {
      return undefined
    }

    const canvas = gl.canvas as HTMLCanvasElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvas.style.pointerEvents = 'none'

    container.appendChild(canvas)

    const initialSettings = settingsRef.current
    const initialColors = colorRef.current
    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex: vertexShaderSource,
      fragment: fragmentShaderSource,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uTimeSpeed: { value: initialSettings.timeSpeed },
        uColorBalance: { value: initialSettings.colorBalance },
        uWarpStrength: { value: initialSettings.warpStrength },
        uWarpFrequency: { value: initialSettings.warpFrequency },
        uWarpSpeed: { value: initialSettings.warpSpeed },
        uWarpAmplitude: { value: initialSettings.warpAmplitude },
        uBlendAngle: { value: initialSettings.blendAngle },
        uBlendSoftness: { value: initialSettings.blendSoftness },
        uRotationAmount: { value: initialSettings.rotationAmount },
        uNoiseScale: { value: initialSettings.noiseScale },
        uGrainAmount: { value: initialSettings.grainAmount },
        uGrainScale: { value: initialSettings.grainScale },
        uGrainAnimated: { value: initialSettings.grainAnimated ? 1 : 0 },
        uContrast: { value: initialSettings.contrast },
        uGamma: { value: initialSettings.gamma },
        uSaturation: { value: initialSettings.saturation },
        uCenterOffset: { value: new Float32Array([0, 0]) },
        uZoom: { value: initialSettings.zoom },
        uColor1: { value: initialColors.color1 },
        uColor2: { value: initialColors.color2 },
        uColor3: { value: initialColors.color3 },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })

    const setSize = () => {
      if (detached) {
        return
      }

      const rect = container.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))

      renderer?.setSize(width, height)

      const resolution = program.uniforms.iResolution.value as Float32Array
      resolution[0] = gl.drawingBufferWidth
      resolution[1] = gl.drawingBufferHeight
    }

    resizeObserver = new ResizeObserver(setSize)
    resizeObserver.observe(container)
    setSize()

    const startTime = performance.now()

    const loop = (timeNow: number) => {
      if (detached) {
        return
      }

      const elapsedSeconds = (timeNow - startTime) / 1000
      const scale = Math.max(0.2, timeScaleRef.current)
      const motionVector = reducedMotion ? { x: 0, y: 0 } : motionRef.current
      const profile = motionProfileRef.current
      const currentSettings = settingsRef.current
      const centerOffset = program.uniforms.uCenterOffset.value as Float32Array
      const color1 = program.uniforms.uColor1.value as Float32Array
      const color2 = program.uniforms.uColor2.value as Float32Array
      const color3 = program.uniforms.uColor3.value as Float32Array
      const colorValues = colorRef.current

      color1.set(colorValues.color1)
      color2.set(colorValues.color2)
      color3.set(colorValues.color3)

      centerOffset[0] = currentSettings.centerX + motionVector.x * profile.x * 0.082
      centerOffset[1] = currentSettings.centerY + motionVector.y * profile.y * 0.065

      program.uniforms.iTime.value = elapsedSeconds
      program.uniforms.uTimeSpeed.value = currentSettings.timeSpeed * scale * (reducedMotion ? 0.5 : 1)
      program.uniforms.uColorBalance.value = currentSettings.colorBalance
      program.uniforms.uWarpStrength.value = currentSettings.warpStrength
      program.uniforms.uWarpFrequency.value = currentSettings.warpFrequency
      program.uniforms.uWarpSpeed.value = currentSettings.warpSpeed * Math.min(scale, 3.5)
      program.uniforms.uWarpAmplitude.value = currentSettings.warpAmplitude
      program.uniforms.uBlendAngle.value = currentSettings.blendAngle
      program.uniforms.uBlendSoftness.value = currentSettings.blendSoftness
      program.uniforms.uRotationAmount.value = currentSettings.rotationAmount
      program.uniforms.uNoiseScale.value = currentSettings.noiseScale
      program.uniforms.uGrainAmount.value = currentSettings.grainAmount
      program.uniforms.uGrainScale.value = currentSettings.grainScale
      program.uniforms.uGrainAnimated.value = currentSettings.grainAnimated ? 1 : 0
      program.uniforms.uContrast.value = currentSettings.contrast
      program.uniforms.uGamma.value = currentSettings.gamma
      program.uniforms.uSaturation.value = currentSettings.saturation
      program.uniforms.uZoom.value = currentSettings.zoom

      renderer?.render({ scene: mesh })
      rafId = window.requestAnimationFrame(loop)
    }

    rafId = window.requestAnimationFrame(loop)

    return () => {
      detached = true
      window.cancelAnimationFrame(rafId)
      resizeObserver?.disconnect()
      try {
        container.removeChild(canvas)
      } catch {
        // Ignore removeChild race on unmount.
      }
    }
  }, [motionRef, performanceTier, reducedMotion])

  return (
    <div
      ref={containerRef}
      className={`nebula-layer grainient-layer ${entered ? 'is-entered' : ''} ${className ?? ''}`}
      aria-hidden
    />
  )
}

export default GrainientBackground
