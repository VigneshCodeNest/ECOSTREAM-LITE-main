const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is required to run this test.");
}

async function run() {
  console.log("Fetching all OpenRouter models...");
  const res = await fetch("https://openrouter.ai/api/v1/models");
  const data = await res.json();
  const freeModels = data.data.filter(m => m.pricing.prompt === "0" && m.pricing.completion === "0" && m.id.endsWith(':free'));
  
  console.log(`Found ${freeModels.length} totally free models. Testing the first few...`);
  
  for (const m of freeModels.slice(0, 10)) {
     try {
       console.log(`Testing ${m.id}...`);
       const t1 = Date.now();
       const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
         method: "POST",
         headers: {
           "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
           "Content-Type": "application/json",
         },
         body: JSON.stringify({
           model: m.id,
           messages: [{ role: "user", content: "Hi" }]
         })
       });
       const text = await response.text();
       const t2 = Date.now();
       if (response.ok) {
          console.log(`✅ SUCCESS: ${m.id} (${t2 - t1}ms)`);
          return; // Stop at first success!
       } else {
          console.log(`❌ FAILED: ${m.id} - ${response.status}`);
       }
     } catch (e) {}
  }
}

run();
