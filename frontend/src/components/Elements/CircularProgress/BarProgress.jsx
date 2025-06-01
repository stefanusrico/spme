<<<<<<< HEAD
const BarProgress = ({ progress }) => {
    const progressBarStyle = `
        @keyframes progressBar {
            from {
                width: 0%;
            }
            to {
                width: ${progress}%;
            }
        }
    `;

    return (
        <div className="w-60 h-18 bg-gray-800 rounded-md bg-gray relative flex items-center justify-center text-white font-bold">
            {/* Inject CSS di dalam <style> */}
            <style>{progressBarStyle}</style>

            <div
                className="bg-blue h-full rounded-md absolute left-0 top-0"
                style={{
                    width: `${progress}%`,
                    animation: "progressBar 1s ease-out",
                }}
            ></div>

            <span 
                className="relative z-10"
                style={{
                    textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
                }}
            >
                {progress}%
            </span>
        </div>
    );
=======
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
>>>>>>> dbv2
};

export default BarProgress;
