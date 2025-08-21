import styled, { css, keyframes } from 'styled-components';

// 动画关键帧定义
export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-20px);
  }
`;

export const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

export const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

export const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const slideInDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

export const scaleOut = keyframes`
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.8);
  }
`;

export const rotateIn = keyframes`
  from {
    opacity: 0;
    transform: rotate(-180deg) scale(0.8);
  }
  to {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
`;

export const bounce = keyframes`
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
`;

export const pulse = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
`;

export const shake = keyframes`
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-4px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(4px);
  }
`;

export const glow = keyframes`
  0%, 100% {
    box-shadow: var(--shadow-md), 0 0 8px rgba(0, 122, 255, 0.2);
  }
  50% {
    box-shadow: var(--shadow-lg), 0 0 20px rgba(0, 122, 255, 0.4);
  }
`;

export const float = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
`;

export const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

export const typing = keyframes`
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
`;

export const blink = keyframes`
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
`;

// 动画组件
export const AnimatedContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => ![
    'animation', 'duration', 'easing', 'delay', 'iterations', 'direction', 'fillMode',
    'fadeIn', 'slideInLeft', 'slideInRight', 'slideInUp', 'slideInDown', 
    'scaleIn', 'rotateIn', 'bounce', 'pulse', 'float', 'glow'
  ].includes(prop)
})`
  ${props => props.animation && css`
    animation: ${props.animation} ${props.duration || '0.6s'} ${props.easing || 'ease-out'} ${props.delay || '0s'} ${props.iterations || '1'} ${props.direction || 'normal'} ${props.fillMode || 'both'};
  `}
  
  ${props => props.fadeIn && css`
    animation: ${fadeIn} ${props.duration || '0.6s'} ease-out;
  `}
  
  ${props => props.slideInLeft && css`
    animation: ${slideInLeft} ${props.duration || '0.6s'} ease-out;
  `}
  
  ${props => props.slideInRight && css`
    animation: ${slideInRight} ${props.duration || '0.6s'} ease-out;
  `}
  
  ${props => props.slideInUp && css`
    animation: ${slideInUp} ${props.duration || '0.6s'} ease-out;
  `}
  
  ${props => props.slideInDown && css`
    animation: ${slideInDown} ${props.duration || '0.6s'} ease-out;
  `}
  
  ${props => props.scaleIn && css`
    animation: ${scaleIn} ${props.duration || '0.4s'} ease-out;
  `}
  
  ${props => props.rotateIn && css`
    animation: ${rotateIn} ${props.duration || '0.8s'} ease-out;
  `}
  
  ${props => props.bounce && css`
    animation: ${bounce} ${props.duration || '1s'} ease;
  `}
  
  ${props => props.pulse && css`
    animation: ${pulse} ${props.duration || '2s'} ease-in-out infinite;
  `}
  
  ${props => props.float && css`
    animation: ${float} ${props.duration || '3s'} ease-in-out infinite;
  `}
  
  ${props => props.glow && css`
    animation: ${glow} ${props.duration || '2s'} ease-in-out infinite;
  `}
`;

// 悬停效果组件
export const HoverEffect = styled.div`
  transition: all var(--duration-normal) var(--ease-out);
  cursor: pointer;
  
  ${props => props.lift && css`
    &:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
    }
  `}
  
  ${props => props.scale && css`
    &:hover {
      transform: scale(${props.scale || '1.05'});
    }
  `}
  
  ${props => props.glow && css`
    &:hover {
      box-shadow: var(--shadow-lg), 0 0 20px rgba(0, 122, 255, 0.3);
    }
  `}
  
  ${props => props.rotate && css`
    &:hover {
      transform: rotate(${props.rotate || '5deg'});
    }
  `}
  
  ${props => props.brightness && css`
    &:hover {
      filter: brightness(${props.brightness || '1.1'});
    }
  `}
  
  ${props => props.blur && css`
    &:hover {
      filter: blur(${props.blur || '2px'});
    }
  `}
`;

// 加载动画组件
export const LoadingSpinner = styled.div`
  width: ${props => props.size || '24px'};
  height: ${props => props.size || '24px'};
  border: 2px solid var(--glass-border);
  border-top: 2px solid var(--primary-blue);
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  
  ${props => props.color && css`
    border-top-color: ${props.color};
  `}
`;

// 脉冲点
export const PulseDot = styled.div`
  width: ${props => props.size || '12px'};
  height: ${props => props.size || '12px'};
  background: ${props => props.color || 'var(--primary-blue)'};
  border-radius: 50%;
  animation: ${pulse} ${props => props.duration || '1.5s'} ease-in-out infinite;
`;

// 浮动元素
export const FloatingElement = styled.div`
  animation: ${float} ${props => props.duration || '3s'} ease-in-out infinite;
  
  ${props => props.delay && css`
    animation-delay: ${props.delay};
  `}
`;

// 打字机效果
export const TypewriterText = styled.div`
  overflow: hidden;
  white-space: nowrap;
  border-right: 2px solid var(--primary-blue);
  animation: 
    ${typing} ${props => props.duration || '3s'} steps(${props => props.steps || '40'}, end),
    ${blink} 1s step-end infinite;
  
  ${props => props.hideAfter && css`
    animation-fill-mode: forwards;
    animation-delay: ${props.hideAfter};
  `}
`;

// 渐变背景动画
export const AnimatedGradient = styled.div`
  background: linear-gradient(
    45deg,
    var(--primary-blue),
    var(--electric-blue),
    var(--cyber-purple),
    var(--primary-blue)
  );
  background-size: 400% 400%;
  animation: gradientShift 8s ease infinite;
  
  @keyframes gradientShift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`;

// 粒子效果容器
export const ParticleContainer = styled.div`
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 20% 20%, rgba(0, 122, 255, 0.1) 1px, transparent 1px),
      radial-gradient(circle at 80% 80%, rgba(0, 122, 255, 0.1) 1px, transparent 1px),
      radial-gradient(circle at 40% 60%, rgba(0, 122, 255, 0.1) 1px, transparent 1px);
    background-size: 50px 50px, 80px 80px, 60px 60px;
    animation: particleFloat 20s linear infinite;
    pointer-events: none;
  }
  
  @keyframes particleFloat {
    0% {
      transform: translateY(0) translateX(0);
    }
    33% {
      transform: translateY(-20px) translateX(10px);
    }
    66% {
      transform: translateY(-10px) translateX(-5px);
    }
    100% {
      transform: translateY(0) translateX(0);
    }
  }
`;

// 进度条动画
export const AnimatedProgressBar = styled.div`
  width: 100%;
  height: ${props => props.height || '4px'};
  background: var(--glass-bg);
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => props.progress || '0%'};
    background: var(--gradient-primary);
    border-radius: var(--radius-full);
    transition: width var(--duration-slow) ease;
    
    ${props => props.animated && css`
      background: linear-gradient(
        90deg,
        var(--primary-blue),
        var(--electric-blue),
        var(--primary-blue)
      );
      background-size: 200% 100%;
      animation: progressShine 2s linear infinite;
    `}
  }
  
  @keyframes progressShine {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

// 呼吸效果
export const BreathingEffect = styled.div`
  animation: breathing ${props => props.duration || '4s'} ease-in-out infinite;
  
  @keyframes breathing {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(${props => props.scale || '1.02'});
      opacity: ${props => props.opacity || '0.8'};
    }
  }
`;

// 波纹效果
export const RippleEffect = styled.div`
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }
  
  &:active::after {
    width: 300px;
    height: 300px;
  }
`;