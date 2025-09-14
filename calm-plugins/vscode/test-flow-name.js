// Quick test to verify flow name extraction works
const { loadCalmModel, ModelIndex } = require('./dist/extension.js');

const testModel = {
  flows: [
    {
      "unique-id": "flow-conference-signup",
      "name": "Conference Signup Flow",
      "description": "Flow for registering a user through the conference website and storing their details in the attendee database.",
      "transitions": [
        {
          "relationship-unique-id": "conference-website-load-balancer",
          "sequence-number": 1,
          "description": "User submits sign-up form via Conference Website to Load Balancer"
        }
      ]
    }
  ]
};

try {
  const model = loadCalmModel(JSON.stringify(testModel));
  console.log('Normalized flows:', model.flows);
  
  // Create a mock document for ModelIndex
  const mockDoc = {
    getText: () => JSON.stringify(testModel),
    positionAt: () => ({ line: 0, character: 0 }),
  };
  
  const modelIndex = new ModelIndex(mockDoc, model);
  console.log('Flow in ModelIndex:', modelIndex.flows);
} catch (error) {
  console.error('Error:', error.message);
}