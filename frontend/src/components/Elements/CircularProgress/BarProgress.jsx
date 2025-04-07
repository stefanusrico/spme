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
};

export default BarProgress;
