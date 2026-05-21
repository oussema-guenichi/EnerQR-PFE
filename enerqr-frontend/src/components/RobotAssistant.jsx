import React from 'react';

export default function RobotAssistant() {
  return (
    <div className="robot-container">
      <img 
        src="/robot_assistant.png" 
        alt="Assistant IA EnerQR" 
        className="robot-assistant"
        onClick={() => alert("Système IA: En écoute! Posez vos questions dans le Chatbot.")}
      />
      <div className="robot-glow"></div>
    </div>
  );
}
