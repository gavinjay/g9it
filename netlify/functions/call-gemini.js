exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { prompt, useGrounding, systemInstruction } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY; // Access the key securely from Netlify environment variable

    if (!apiKey) {
        console.error("API key is not configured in Netlify environment variables.");
        return { statusCode: 500, body: "API key is not configured." };
    }

    const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=';
    
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ]
    };

    if (useGrounding) {
        payload.tools = [{ "google_search": {} }];
    }
    
    if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    try {
        const response = await fetch(`${GEMINI_API_ENDPOINT}${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Gemini API Error:", response.status, errorBody);
            return { statusCode: response.status, body: `Gemini API Error: ${errorBody}` };
        }

        const result = await response.json();
        
        // Basic check for valid response structure
        if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0].text) {
             return {
                statusCode: 200,
                // Return JSON containing the text result
                body: JSON.stringify({ text: result.candidates[0].content.parts[0].text })
            };
        } else {
             console.error("Unexpected Gemini API response structure:", result);
             return { statusCode: 500, body: "Unexpected response format from Gemini API." };
        }

    } catch (error) {
        console.error("Netlify function error:", error);
        return { statusCode: 500, body: `Server error: ${error.message}` };
    }
};

