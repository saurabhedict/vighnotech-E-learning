import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Real interactive 3D viewer (drag to orbit, scroll to zoom). Loads a .glb when
// `src` is provided; otherwise shows a procedural model so the 3D lane is
// demonstrable without a bundled asset.
export default function Model3DViewer({ src, watermark }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    const width = mount.clientWidth
    const height = 360

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#241317')

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 1.2, 4)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const key = new THREE.DirectionalLight(0xffffff, 1.1)
    key.position.set(3, 4, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xff9d6b, 0.6)
    rim.position.set(-4, -2, -3)
    scene.add(rim)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.2

    let model
    let disposed = false

    if (src) {
      new GLTFLoader().load(
        src,
        (gltf) => {
          if (disposed) return
          model = gltf.scene
          // center + scale to fit
          const box = new THREE.Box3().setFromObject(model)
          const size = box.getSize(new THREE.Vector3()).length()
          const center = box.getCenter(new THREE.Vector3())
          model.position.sub(center)
          model.scale.setScalar(2.5 / (size || 1))
          scene.add(model)
        },
        undefined,
        () => addProcedural()
      )
    } else {
      addProcedural()
    }

    function addProcedural() {
      const geo = new THREE.TorusKnotGeometry(0.8, 0.28, 160, 32)
      const mat = new THREE.MeshStandardMaterial({ color: '#e67e22', metalness: 0.4, roughness: 0.25 })
      model = new THREE.Mesh(geo, mat)
      scene.add(model)
    }

    let raf
    const animate = () => {
      raf = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w = mount.clientWidth
      camera.aspect = w / height
      camera.updateProjectionMatrix()
      renderer.setSize(w, height)
    }
    window.addEventListener('resize', onResize)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [src])

  return (
    <div className="relative rounded-xl overflow-hidden">
      <div ref={mountRef} className="w-full" style={{ height: 360 }} />
      <div className="absolute bottom-2 left-3 text-xs text-white/70 pointer-events-none">🖱 drag to rotate · scroll to zoom</div>
      {watermark && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/10 text-2xl font-extrabold -rotate-12 select-none">
          {watermark}
        </div>
      )}
    </div>
  )
}
