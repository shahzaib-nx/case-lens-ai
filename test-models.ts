import 'dotenv/config';

async function listModels() {
  const response = await fetch('https://api.x.ai/v1/models', {
    headers: {
      'Authorization': `Bearer ${process.env.GROK_API_KEY}`
    }
  });
  
  if (!response.ok) {
    console.error("Failed to fetch models", await response.text());
    return;
  }
  
  const data = await response.json();
  console.log("Available models:");
  data.data.forEach((m: any) => console.log(m.id));
}

listModels();
