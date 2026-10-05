// GLB file type declarations
declare module '*.glb' {
  const src: string;
  export default src;
}

declare module '*.glb?url' {
  const src: string;
  export default src;
}

// MediaPipe global types
interface Window {
  Hands: any;
  Camera: any;
}
