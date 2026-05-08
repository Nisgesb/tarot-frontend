export interface GrainientSettings {
  color1: string
  color2: string
  color3: string
  timeSpeed: number
  colorBalance: number
  warpStrength: number
  warpFrequency: number
  warpSpeed: number
  warpAmplitude: number
  blendAngle: number
  blendSoftness: number
  rotationAmount: number
  noiseScale: number
  grainAmount: number
  grainScale: number
  grainAnimated: boolean
  contrast: number
  gamma: number
  saturation: number
  centerX: number
  centerY: number
  zoom: number
}

export const DEFAULT_GRAINIENT_SETTINGS: GrainientSettings = {
  color1: '#FF9FFC',
  color2: '#5227FF',
  color3: '#B497CF',
  timeSpeed: 0.25,
  colorBalance: 0,
  warpStrength: 1,
  warpFrequency: 5,
  warpSpeed: 2,
  warpAmplitude: 50,
  blendAngle: 0,
  blendSoftness: 0.05,
  rotationAmount: 500,
  noiseScale: 2,
  grainAmount: 0.1,
  grainScale: 2,
  grainAnimated: false,
  contrast: 1.5,
  gamma: 1,
  saturation: 1,
  centerX: 0,
  centerY: 0,
  zoom: 0.9,
}
