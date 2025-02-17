import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import Typography from '@mui/material/Typography';

export default function VersionStepper({ dataSteps, paramActiveStep, onStepChange }) {
  const [steps, setSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (dataSteps && dataSteps.length > 0 && paramActiveStep) {
        const index = parseInt(paramActiveStep, 10) || 0;
        console.log(index)
        setActiveStep(index)
        setSteps(dataSteps);
    }
  }, [dataSteps]);

  const handleStepClick = (index) => {
    setActiveStep(index); 
    onStepChange(index)
  };

  return (
    <Box sx={{ maxWidth: 400, ml: 4 }}>
      <Stepper activeStep={activeStep} orientation="vertical" nonLinear>
        {steps.map((step, index) => (
          <Step key={step.id}>
            <StepLabel
              onClick={() => handleStepClick(index)}
              sx={{ cursor: 'pointer' }} // Make the step label clickable
            >
              <strong>{step.commit.toUpperCase()}</strong> {/* Display commit as step title */}
            </StepLabel>
            {activeStep === index && ( // Display the content of the active step
              <StepContent>
                <Typography sx={{fontSize: "0.875rem"}}>
                  Oleh         : {step.user_name}
                </Typography>
                <Typography sx={{fontSize: "0.875rem"}}>
                  Tanggal : {new Intl.DateTimeFormat("en-GB", { 
                        day: "2-digit", 
                        month: "short", 
                        year: "numeric", 
                    }).format(new Date(step.created_at))}
                </Typography>
                <Typography sx={{fontSize: "0.875rem"}}>
                  Jam     : {new Intl.DateTimeFormat("en-GB", { 
                        hour: "2-digit", 
                        minute: "2-digit", 
                        hour12: false // Gunakan format 24 jam, set ke `true` jika ingin 12 jam
                    }).format(new Date(step.created_at))}
                </Typography>
              </StepContent>
            )}
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}
