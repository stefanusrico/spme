import React from 'react';

const BarProgress = ({ progress, width = 200, height = 50 }) => {
  const containerStyle = {
    width,
    height,
    backgroundColor: '#2d2d2d', // bg-gray-800
    borderRadius: 8,             // rounded-md
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    color: 'white',
  };

  const barStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: `${progress}%`,
    backgroundColor: '#1890ff',  // Antd blue
    transition: 'width 1s ease-out',
  };

  const labelStyle = {
    position: 'relative',
    zIndex: 1,
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
  };

  return (
    <div style={containerStyle}>
      <div style={barStyle} />
      <span style={labelStyle}>{progress}%</span>
    </div>
  );
};

export default BarProgress;
