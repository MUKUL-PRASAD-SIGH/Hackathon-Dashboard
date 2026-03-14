import React, { useEffect, useRef } from 'react';
import './ThreeBackground.css';

const ThreeBackground = () => {
  const mountRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const THREE = window.THREE;
    if (!THREE || !mountRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    const group = new THREE.Group();

    const torusGeo = new THREE.TorusKnotGeometry(1.4, 0.32, 220, 18);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0x23f2ff,
      metalness: 0.6,
      roughness: 0.25,
      emissive: 0x0a2a2f,
      emissiveIntensity: 0.6
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.position.set(-1.4, 0.4, -2);
    group.add(torus);

    const sphereGeo = new THREE.IcosahedronGeometry(1.1, 1);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x7a6cff,
      metalness: 0.35,
      roughness: 0.4,
      emissive: 0x1d1635,
      emissiveIntensity: 0.7
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.set(2.1, -0.6, -1.5);
    group.add(sphere);

    const ringGeo = new THREE.RingGeometry(1.8, 2.3, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff4bd8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.6;
    ring.position.set(0.4, -1.6, -3.2);
    group.add(ring);

    const particleCount = 420;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = -Math.random() * 14;
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0x9bd7ff,
      size: 0.03,
      transparent: true,
      opacity: 0.65
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    const ambient = new THREE.AmbientLight(0x334466, 0.65);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(0x23f2ff, 1.4, 30);
    keyLight.position.set(-4, 2, 6);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xff4bd8, 1.1, 30);
    rimLight.position.set(5, -2, 4);
    scene.add(rimLight);

    scene.add(group);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      if (!prefersReducedMotion) {
        group.rotation.y += 0.0022;
        group.rotation.x += 0.0012;
        torus.rotation.y += 0.0024;
        sphere.rotation.x -= 0.0016;
        ring.rotation.z -= 0.0008;
      }
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      torusGeo.dispose();
      torusMat.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      starsGeo.dispose();
      starsMat.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div className="three-background" ref={mountRef} aria-hidden="true" />;
};

export default ThreeBackground;
