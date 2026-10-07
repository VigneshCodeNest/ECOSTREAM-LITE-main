const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is required to run this test.");
}

async function testModel(model) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "Say hello!" }]
      })
    });
    const text = await response.text();
    console.log(`Model ${model}: Status ${response.status}`);
    if (!response.ok) {
       console.log(`Error: ${text}`);
    } else {
       console.log(`Success!`);
    }
  } catch (e) {
    console.log(`Exception for ${model}: ${e}`);
  }
}

async function run() {
  await testModel("meta-llama/llama-3.3-70b-instruct:free");
  await testModel("meta-llama/llama-3.2-3b-instruct:free");
  await testModel("meta-llama/llama-3.1-8b-instruct:free");
  await testModel("grip-models/grip-7b");
  await testModel("mistralai/mistral-7b-instruct:free");
  await testModel("google/gemini-2.5-flash:free");
}

run();
