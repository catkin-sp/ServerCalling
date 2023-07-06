// This is an example headless task that simply logs a message.
const myHeadlessTask = async (taskData) => {
    console.log('Running headless task with data:', taskData);
    // Perform any asynchronous operations here (e.g., network requests, data processing).
    // Make sure to return a Promise when the task is completed.
  };
  
  export default myHeadlessTask;