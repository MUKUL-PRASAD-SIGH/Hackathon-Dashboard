import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import './AuthLayout.css';

// 3D Background Component
const ThreeDBackground = () => {
  return (
    <div className="three-d-background">
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Stars 
          radius={100} 
          depth={50} 
          count={5000} 
          factor={4} 
          saturation={0} 
          fade 
          speed={1} 
        />
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
};

// Floating 3D Shapes
const FloatingShapes = () => {
  return (
    <div className="floating-shapes">
      <div className="shape shape-1"></div>
      <div className="shape shape-2"></div>
      <div className="shape shape-3"></div>
    </div>
  );
};

// Auth Layout Component
export const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="auth-layout">
      <ThreeDBackground />
      <FloatingShapes />
      
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>
          
          <div className="auth-content">
            {children}
          </div>
          
          <div className="auth-footer">
            <p>Made with ❤️ by Mukul</p>
            <p className="page-number">Page 1 of 3</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
