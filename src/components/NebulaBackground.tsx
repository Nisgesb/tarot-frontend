import { useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import type { ParallaxPoint } from '../hooks/useParallax'

interface NebulaBackgroundProps {
  entered: boolean
  reducedMotion: boolean
  parallaxRef: MutableRefObject<ParallaxPoint>
  className?: string
  timeScale?: number
}

const vertexShaderSource = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const fragmentShaderSource = `
precision mediump float;

varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_parallax;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);

  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.55;
  mat2 matrix = mat2(1.6, 1.2, -1.2, 1.6);

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(st);
    st = matrix * st;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = v_uv;
  vec2 position = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  position += u_parallax * vec2(0.03, 0.02);

  float t = u_time * 0.18;
  float radius = length(position);
  float angle = atan(position.y, position.x);

  float turbulence = sin(radius * 8.0 - t * 2.5 + fbm(position * 2.3 + t * 0.03) * 4.0);
  angle += turbulence * 0.15;

  vec2 swirl = vec2(cos(angle), sin(angle)) * radius;
  swirl += vec2(t * 0.07, -t * 0.04);

  float n1 = fbm(swirl * 3.5 + vec2(0.0, t * 0.32));
  float n2 = fbm(swirl * 2.0 - vec2(t * 0.27, 0.0));
  float n3 = fbm(swirl * 4.2 + vec2(t * 0.14, -t * 0.2));

  float nebula = smoothstep(0.17, 0.92, n1 * 0.55 + n2 * 0.34 + n3 * 0.24);
  float stream = smoothstep(0.3, 0.88, n2 + 0.25 * sin(t + radius * 8.0));
  float halo = exp(-pow(max(radius - 0.36, 0.0) * 3.2, 2.0));
  float centerMist = smoothstep(0.96, 0.14, radius);

  vec3 deepBlue = vec3(0.01, 0.07, 0.34);
  vec3 electricBlue = vec3(0.0, 0.33, 1.0);
  vec3 cyanBlue = vec3(0.22, 0.74, 1.0);
  vec3 lilac = vec3(0.89, 0.73, 1.0);

  vec3 color = deepBlue;
  color += electricBlue * (nebula * 0.85 + centerMist * 0.2);
  color += cyanBlue * stream * 0.45;
  color = mix(color, lilac, smoothstep(0.5, 1.0, n3) * 0.24 + halo * 0.2);

  float bloom = 0.18 / (0.27 + radius * radius * 2.8);
  color += vec3(0.02, 0.12, 0.35) * bloom;

  float breathing = 0.95 + 0.05 * sin(t * 0.9);
  color *= breathing;
  color *= 1.04 - smoothstep(0.9, 1.45, radius) * 0.22;

  gl_FragColor = vec4(color, 1.0);
}
`

function compileShader(
  gl: WebGLRenderingContext,
  shaderType: number,
  shaderSource: string,
) {
  const shader = gl.createShader(shaderType)

  if (!shader) {
    throw new Error('Failed to create shader')
  }

  gl.shaderSource(shader, shaderSource)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'Unknown shader error'
    gl.deleteShader(shader)
    throw new Error(info)
  }

  return shader
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
) {
  const program = gl.createProgram()

  if (!program) {
    throw new Error('Failed to create shader program')
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? 'Unknown program link error'
    gl.deleteProgram(program)
    throw new Error(info)
  }

  return program
}

export function NebulaBackground({
  entered,
  reducedMotion,
  parallaxRef,
  className,
  timeScale = 1,
}: NebulaBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timeScaleRef = useRef(timeScale)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    timeScaleRef.current = timeScale
  }, [timeScale])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    })

    if (!gl) {
      setUseFallback(true)
      return undefined
    }

    let program: WebGLProgram | null = null
    let vertexShader: WebGLShader | null = null
    let fragmentShader: WebGLShader | null = null
    let vertexBuffer: WebGLBuffer | null = null
    let frameId = 0
    let width = 0
    let height = 0

    try {
      vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
      fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
      program = createProgram(gl, vertexShader, fragmentShader)
      vertexBuffer = gl.createBuffer()
    } catch (error) {
      console.error(error)
      setUseFallback(true)
      return undefined
    }

    if (!program || !vertexBuffer) {
      setUseFallback(true)
      return undefined
    }

    const positionLocation = gl.getAttribLocation(program, 'a_position')
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const timeLocation = gl.getUniformLocation(program, 'u_time')
    const parallaxLocation = gl.getUniformLocation(program, 'u_parallax')

    if (
      positionLocation === -1 ||
      !resolutionLocation ||
      !timeLocation ||
      !parallaxLocation
    ) {
      setUseFallback(true)
      return undefined
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    )

    gl.useProgram(program)
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    const resize = () => {
      const cappedPixelRatio = Math.min(
        window.devicePixelRatio || 1,
        window.innerWidth <= 768 ? 1.5 : 2,
      )

      width = Math.floor(window.innerWidth * cappedPixelRatio)
      height = Math.floor(window.innerHeight * cappedPixelRatio)

      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, width, height)
    }

    resize()
    window.addEventListener('resize', resize)

    const startTime = performance.now()

    const render = (now: number) => {
      const elapsedSeconds = (now - startTime) / 1000
      const { x, y } = parallaxRef.current

      gl.uniform2f(resolutionLocation, width, height)
      gl.uniform1f(
        timeLocation,
        elapsedSeconds * (reducedMotion ? 0.55 : 1) * Math.max(0.2, timeScaleRef.current),
      )
      gl.uniform2f(parallaxLocation, x, y)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      frameId = window.requestAnimationFrame(render)
    }

    frameId = window.requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(frameId)

      if (vertexBuffer) {
        gl.deleteBuffer(vertexBuffer)
      }

      if (program) {
        gl.deleteProgram(program)
      }

      if (vertexShader) {
        gl.deleteShader(vertexShader)
      }

      if (fragmentShader) {
        gl.deleteShader(fragmentShader)
      }
    }
  }, [parallaxRef, reducedMotion])

  if (useFallback) {
    return (
      <div
        className={`nebula-layer nebula-fallback ${entered ? 'is-entered' : ''} ${className ?? ''}`}
      />
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className={`nebula-layer ${entered ? 'is-entered' : ''} ${className ?? ''}`}
      aria-hidden
    />
  )
}
