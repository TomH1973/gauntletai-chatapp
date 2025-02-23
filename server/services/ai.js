// Simple mock AI service
const handleAIResponse = async (text) => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // For now, just prepend 'AI: ' to the message
  // This will be replaced with actual AI integration later
  return `AI: ${text}`;
};

module.exports = {
  handleAIResponse
}; 