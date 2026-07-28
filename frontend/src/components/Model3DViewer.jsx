import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Interactive 3D viewer — loads a real .glb when `src` is provided (drag to orbit,
// scroll to zoom). With no model (or a model that fails to load), it shows a small,
// simple placeholder instead of a big empty canvas.
export default function Model3DViewer({ src, watermark }) {
  const mountRef = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => { setFailed(false) }, [src]) // reset when the source changes

  useEffect(() => {
    if (!src || failed) return // no model → small placeholder below, skip WebGL
    const mount = mountRef.current
    const width = mount.clientWidth || 640
    const height = 320

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#241317')
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 1.2, 4)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 4, 5); scene.add(key)
    const rim = new THREE.DirectionalLight(0xff9d6b, 0.6); rim.position.set(-4, -2, -3); scene.add(rim)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.2

    let disposed = false
    new GLTFLoader().load(
      src,
      (gltf) => {
        if (disposed) return
        const model = gltf.scene
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3()).length()
        const center = box.getCenter(new THREE.Vector3())
        model.position.sub(center)
        model.scale.setScalar(2.5 / (size || 1))
        scene.add(model)
      },
      undefined,
      () => { if (!disposed) setFailed(true) } // no demo model — fall back to the placeholder
    )

    let raf
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera) }
    animate()

    const onResize = () => { const w = mount.clientWidth; camera.aspect = w / height; camera.updateProjectionMatrix(); renderer.setSize(w, height) }
    window.addEventListener('resize', onResize)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((mm) => { Object.values(mm).forEach((v) => v && v.isTexture && v.dispose()); mm.dispose() })
        }
      })
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [src, failed])

  // No model (or it failed to load) → a small, simple placeholder.
  if (!src || failed) {
    return (
      <div className="rounded-xl bg-[#241317] flex items-center justify-center gap-3 px-4 py-6">
        <svg className="w-7 h-7 text-white/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
        <span className="text-white/60 text-sm">No 3D model available for this item.</span>
      </div>
    )
  }

  return (
    <div className="relative rounded-xl overflow-hidden">
      <div ref={mountRef} className="w-full" style={{ height: 320 }} />
      <div className="absolute bottom-2 left-3 text-xs text-white/70 pointer-events-none">🖱 drag to rotate · scroll to zoom</div>
      {watermark && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/10 text-2xl font-extrabold -rotate-12 select-none">
          {watermark}
        </div>
      )}
    </div>
  )
}
