import React, { useState, useRef, useEffect, memo } from 'react';
import styled from 'styled-components';

const ImageContainer = styled.div`
  position: relative;
  overflow: hidden;
  background: var(--glass-bg);
  border-radius: var(--radius-md);
`;

const OptimizedImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
  opacity: ${props => props.loaded ? 1 : 0};
`;

const PlaceholderDiv = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  
  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

/**
 * 优化的图片组件
 * 支持懒加载、占位符、错误处理
 */
const LazyImage = memo(({ 
  src, 
  alt, 
  placeholder, 
  className,
  style,
  onLoad,
  onError,
  ...props 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef();
  
  // 懒加载逻辑
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  const handleLoad = () => {
    setLoaded(true);
    onLoad && onLoad();
  };
  
  const handleError = () => {
    setError(true);
    onError && onError();
  };
  
  return (
    <ImageContainer ref={imgRef} className={className} style={style}>
      {!loaded && !error && <PlaceholderDiv />}
      {inView && (
        <OptimizedImage
          src={src}
          alt={alt}
          loaded={loaded}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
      {error && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          color: '#999'
        }}>
          图片加载失败
        </div>
      )}
    </ImageContainer>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;
